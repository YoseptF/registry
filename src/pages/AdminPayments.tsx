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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, Filter, X, Eye, EyeOff } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { Class } from "@/types";
import { format } from "date-fns";

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
  status: "pending" | "paid";
  enrolled_at: string;
  package_name?: string;
}

export function AdminPayments() {
  const { t } = useTranslation();
  usePageTitle("pages.payments");
  const [paymentItems, setPaymentItems] = useState<PaymentLineItem[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterInstructor, setFilterInstructor] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [showAdminEarnings, setShowAdminEarnings] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all classes
      const { data: classesData } = await supabase
        .from("classes")
        .select("*")
        .order("name");
      setClasses(classesData || []);

      // Fetch all instructors (including admins who can teach classes)
      const { data: instructorsData } = await supabase
        .from("profiles")
        .select("id, name")
        .in("role", ["instructor", "admin"])
        .order("name");
      setInstructors(instructorsData || []);

      // Fetch enrollment-based payments
      const { data: enrollmentsData, error } = await supabase
        .from("class_enrollments")
        .select(`
          id,
          enrolled_at,
          checked_in,
          user_id,
          class_session_id,
          package_purchase_id,
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
        .order("enrolled_at", { ascending: false });

      if (error) throw error;

      // Transform enrollments into payment line items
      const items: PaymentLineItem[] = (enrollmentsData || [])
        .filter((e: any) => e.session?.class && e.user && e.package)
        .map((enrollment: any) => {
          const cls = enrollment.session.class;
          const pkg = enrollment.package;

          // Calculate instructor payment per class
          const amountPerClass = pkg.amount_paid / pkg.num_classes;
          let instructorPayment = 0;

          if (cls.instructor_payment_type === 'flat') {
            instructorPayment = cls.instructor_payment_value || 0;
          } else {
            // percentage
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
            status: enrollment.checked_in ? 'paid' : 'pending',
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
    if (filterInstructor !== "all" && item.instructor_id !== filterInstructor) return false;
    if (filterClass !== "all" && item.class_id !== filterClass) return false;
    return true;
  });

  const totalStudentRevenue = filteredItems.reduce((sum, item) => sum + item.amount_paid, 0);
  const totalInstructorPayments = filteredItems.reduce((sum, item) => sum + item.instructor_payment, 0);
  const totalAdminEarnings = filteredItems.reduce((sum, item) => sum + item.admin_earnings, 0);
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
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
              {t("pages.payments")}
            </h1>
            <p className="text-gray-600 mt-2">{t("payments.manageInstructorPayments")}</p>
          </div>
          <Button
            variant={showAdminEarnings ? "default" : "outline"}
            onClick={() => setShowAdminEarnings(!showAdminEarnings)}
            className="flex items-center gap-2"
          >
            {showAdminEarnings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAdminEarnings ? t("payments.hideAdminEarnings") : t("payments.showAdminEarnings")}
          </Button>
        </div>

        {/* Stats Cards */}
        <div className={`grid ${showAdminEarnings ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-2'} gap-6 mb-8`}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("payments.totalStudentRevenue")}</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalStudentRevenue.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {totalEnrollments} {t("payments.enrollments")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t("payments.totalInstructorPayments")}</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalInstructorPayments.toFixed(2)}</div>
              <p className="text-xs text-gray-500 mt-1">
                {t("payments.instructorEarnings")}
              </p>
            </CardContent>
          </Card>

          {showAdminEarnings && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("payments.totalAdminEarnings")}</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${totalAdminEarnings.toFixed(2)}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("payments.profitMargin")}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{t("payments.avgRevenuePerEnrollment")}</CardTitle>
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalEnrollments > 0 ? (totalStudentRevenue / totalEnrollments).toFixed(2) : '0.00'}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {t("payments.perEnrollment")}
                  </p>
                </CardContent>
              </Card>
            </>
          )}
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
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t("payments.filterByInstructor")}</label>
                <Select value={filterInstructor} onValueChange={setFilterInstructor}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("common.all")}</SelectItem>
                    {instructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    setFilterInstructor("all");
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
            <CardTitle>{t("payments.paymentDetails")}</CardTitle>
            <CardDescription>
              {t("payments.allInstructorEarnings")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("common.date")}</TableHead>
                    <TableHead>{t("user.user")}</TableHead>
                    <TableHead>{t("admin.class")}</TableHead>
                    <TableHead>{t("payments.instructor")}</TableHead>
                    <TableHead>{t("payments.package")}</TableHead>
                    <TableHead className="text-right">{t("payments.studentPaid")}</TableHead>
                    <TableHead className="text-right">{t("payments.instructorEarns")}</TableHead>
                    {showAdminEarnings && (
                      <TableHead className="text-right">{t("payments.adminEarns")}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={showAdminEarnings ? 8 : 7} className="text-center text-gray-500 py-8">
                        {t("payments.noPayments")}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {format(new Date(item.session_date + 'T00:00:00'), "MMM d, yyyy")}
                          <div className="text-xs text-gray-500">{item.session_time}</div>
                        </TableCell>
                        <TableCell>
                          <div>{item.user_name}</div>
                          <div className="text-xs text-gray-500">{item.user_email}</div>
                        </TableCell>
                        <TableCell>{item.class_name}</TableCell>
                        <TableCell>{item.instructor_name}</TableCell>
                        <TableCell className="text-sm">{item.package_name}</TableCell>
                        <TableCell className="text-right font-medium">
                          ${item.amount_paid.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          ${item.instructor_payment.toFixed(2)}
                        </TableCell>
                        {showAdminEarnings && (
                          <TableCell className="text-right font-bold text-blue-600">
                            ${item.admin_earnings.toFixed(2)}
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
