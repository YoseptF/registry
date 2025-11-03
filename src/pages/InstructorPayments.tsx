import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, Filter, X } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PaymentsTable } from "@/components/PaymentsTable";
import type { Class } from "@/types";
import { useAuth } from "@/contexts/AuthContext";

interface PaymentLineItem {
  id: string;
  user_name: string;
  user_email: string;
  class_name: string;
  class_id: string;
  instructor_id: string;
  instructor_name: string;
  session_date: string;
  session_time: string;
  amount_paid: number;
  instructor_payment: number;
  admin_earnings: number;
  payment_method: "package" | "credit";
  enrolled_at: string;
  package_name?: string;
}

export function InstructorPayments() {
  const { t } = useTranslation();
  const { profile } = useAuth();
  usePageTitle("pages.payments");
  const [paymentItems, setPaymentItems] = useState<PaymentLineItem[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>("all");

  useEffect(() => {
    if (profile) {
      fetchPaymentData();
    }
  }, [profile]);

  const fetchPaymentData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const { data: classesData } = await supabase
        .from("classes")
        .select("*")
        .eq("instructor_id", profile.id)
        .order("name");
      setClasses(classesData || []);

      const { data: enrollmentsData, error } = await supabase
        .from("class_enrollments")
        .select(`
          id,
          enrolled_at,
          checked_in,
          user_id,
          class_session_id,
          package_purchase_id,
          paid_out_at,
          user:profiles!class_enrollments_user_id_fkey(name, email),
          session:class_sessions!class_enrollments_class_session_id_fkey(
            session_date,
            session_time,
            class:classes(
              id,
              name,
              instructor_id,
              instructor_payment_type,
              instructor_payment_value,
              instructor:profiles!classes_instructor_id_fkey(name)
            )
          ),
          package:class_package_purchases!class_enrollments_package_purchase_id_fkey(
            package_name,
            amount_paid,
            num_classes
          )
        `)
        .is("paid_out_at", null)
        .order("enrolled_at", { ascending: false });

      if (error) throw error;

      const items: PaymentLineItem[] = (enrollmentsData || [])
        .filter((e: any) => e.session?.class && e.user && e.package)
        .filter((e: any) => e.session.class.instructor_id === profile.id)
        .map((enrollment: any) => {
          const cls = enrollment.session.class;
          const pkg = enrollment.package;

          const amountPerClass = pkg.amount_paid / pkg.num_classes;
          let instructorPayment = 0;

          if (cls.instructor_payment_type === 'flat') {
            instructorPayment = cls.instructor_payment_value || 0;
          } else {
            instructorPayment = amountPerClass * ((cls.instructor_payment_value || 70) / 100);
          }

          const roundedInstructorPayment = Math.round(instructorPayment * 100) / 100;
          const adminEarnings = Math.round((amountPerClass - roundedInstructorPayment) * 100) / 100;

          return {
            id: enrollment.id,
            user_name: enrollment.user.name,
            user_email: enrollment.user.email,
            class_name: cls.name,
            class_id: cls.id,
            instructor_id: cls.instructor_id,
            instructor_name: cls.instructor?.name || t("common.unknown"),
            session_date: enrollment.session.session_date,
            session_time: enrollment.session.session_time,
            amount_paid: amountPerClass,
            instructor_payment: roundedInstructorPayment,
            admin_earnings: adminEarnings,
            payment_method: 'package',
            enrolled_at: enrollment.enrolled_at,
            package_name: pkg.package_name,
          };
        });

      setPaymentItems(items);
    } catch (error) {
      console.error("Error fetching payment data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = paymentItems.filter((item) => {
    if (filterClass !== "all" && item.class_id !== filterClass) return false;
    return true;
  });

  const totalInstructorPayments = filteredItems.reduce((sum, item) => sum + item.instructor_payment, 0);
  const totalEnrollments = filteredItems.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t("instructor.myPayments")}
          </h1>
          <p className="text-gray-600 mt-2">{t("instructor.viewYourEarnings")}</p>
        </div>

        {/* Stats Card */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("instructor.pendingEarnings")}</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalInstructorPayments.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {totalEnrollments} {t("payments.enrollments")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              {t("common.filters")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t("payments.filterByClass")}</label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilterClass("all");
                  }}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  {t("common.clearFilters")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle>{t("instructor.pendingEarnings")}</CardTitle>
            <CardDescription>
              {t("payments.outstandingDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentsTable
              items={filteredItems}
              showAdminEarnings={false}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
