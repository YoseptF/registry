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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Filter, X, Eye, EyeOff, ChevronDown, ChevronUp, PlayCircle } from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { PaymentsTable } from "@/components/PaymentsTable";
import type { Class, PaymentLineItem } from "@/types";
import type { Database } from "@/types/database";
import { format } from "date-fns";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

type PaymentBatch = Database["public"]["Tables"]["instructor_payment_batches"]["Row"];
type PaymentItem = Database["public"]["Tables"]["instructor_payment_items"]["Row"];
type PaymentSettings = Database["public"]["Tables"]["payment_settings"]["Row"];

interface BatchWithItems extends PaymentBatch {
  instructor_name: string;
  items?: PaymentItem[];
  expanded?: boolean;
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
  const [activeTab, setActiveTab] = useState("outstanding");

  const [batches, setBatches] = useState<BatchWithItems[]>([]);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [settings, setSettings] = useState<PaymentSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [processingPayments, setProcessingPayments] = useState(false);

  useEffect(() => {
    fetchOutstandingPayments();
  }, []);

  useEffect(() => {
    if (activeTab === "history") {
      fetchPaymentBatches();
    } else if (activeTab === "settings") {
      fetchSettings();
    }
  }, [activeTab]);

  const fetchOutstandingPayments = async () => {
    setLoading(true);
    try {
      const { data: classesData } = await supabase
        .from("classes")
        .select("*")
        .order("name");
      setClasses(classesData || []);

      const { data: instructorsData } = await supabase
        .from("profiles")
        .select("id, name")
        .in("role", ["instructor", "admin"])
        .order("name");
      setInstructors(instructorsData || []);

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
      toast.error(t("common.error"), {
        description: t("payments.processError"),
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentBatches = async () => {
    setBatchesLoading(true);
    try {
      const { data: batchesData, error } = await supabase
        .from("instructor_payment_batches")
        .select(`
          *,
          instructor:profiles!instructor_payment_batches_instructor_id_fkey(name)
        `)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      const batchesWithNames: BatchWithItems[] = (batchesData || []).map((batch: any) => ({
        ...batch,
        instructor_name: batch.instructor?.name || t("common.unknown"),
        expanded: false,
      }));

      setBatches(batchesWithNames);
    } catch (error) {
      console.error("Error fetching payment batches:", error);
      toast.error(t("common.error"), {
        description: t("payments.processError"),
      });
    } finally {
      setBatchesLoading(false);
    }
  };

  const fetchBatchItems = async (batchId: string) => {
    try {
      const { data: itemsData, error } = await supabase
        .from("instructor_payment_items")
        .select("*")
        .eq("payment_batch_id", batchId)
        .order("session_date", { ascending: false });

      if (error) throw error;

      setBatches((prev) =>
        prev.map((batch) =>
          batch.id === batchId
            ? { ...batch, items: itemsData || [], expanded: !batch.expanded }
            : batch
        )
      );
    } catch (error) {
      console.error("Error fetching batch items:", error);
      toast.error(t("common.error"), {
        description: t("payments.processError"),
      });
    }
  };

  const toggleBatchExpansion = (batchId: string, isExpanded: boolean) => {
    if (!isExpanded) {
      fetchBatchItems(batchId);
    } else {
      setBatches((prev) =>
        prev.map((batch) =>
          batch.id === batchId ? { ...batch, expanded: false } : batch
        )
      );
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const { data: settingsData, error } = await supabase
        .from("payment_settings")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      setSettings(settingsData || {
        id: '',
        payment_day: 'friday',
        payment_hour: 18,
        payment_minute: 0,
        timezone: 'America/Mexico_City',
        auto_process: true,
        created_at: '',
        updated_at: '',
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error(t("common.error"), {
        description: t("payments.settingsError"),
      });
    } finally {
      setSettingsLoading(false);
    }
  };

  const saveSettings = async () => {
    if (!settings) return;

    setSavingSettings(true);
    try {
      const { error: updateError } = await supabase
        .from("payment_settings")
        .update({
          payment_day: settings.payment_day,
          payment_hour: settings.payment_hour,
          payment_minute: settings.payment_minute,
          timezone: settings.timezone,
          auto_process: settings.auto_process,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      if (updateError) throw updateError;

      const { error: scheduleError } = await supabase.rpc("update_payment_schedule");
      if (scheduleError) throw scheduleError;

      toast.success(t("common.success"), {
        description: t("payments.settingsSaved"),
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error(t("common.error"), {
        description: t("payments.settingsError"),
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const processPaymentsNow = async () => {
    if (!confirm(t("payments.processPaymentsConfirm"))) return;

    setProcessingPayments(true);
    try {
      const { error } = await supabase.rpc("process_instructor_payments");
      if (error) throw error;

      toast.success(t("common.success"), {
        description: t("payments.paymentsProcessed"),
      });

      fetchOutstandingPayments();
      fetchPaymentBatches();
    } catch (error) {
      console.error("Error processing payments:", error);
      toast.error(t("common.error"), {
        description: t("payments.processError"),
      });
    } finally {
      setProcessingPayments(false);
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

  if (loading && activeTab === "outstanding") {
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-[600px] grid-cols-3">
            <TabsTrigger value="outstanding">{t("payments.outstanding")}</TabsTrigger>
            <TabsTrigger value="history">{t("payments.history")}</TabsTrigger>
            <TabsTrigger value="settings">{t("payments.settings")}</TabsTrigger>
          </TabsList>

          <TabsContent value="outstanding" className="mt-6">
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
                <CardTitle>{t("payments.outstandingPayments")}</CardTitle>
                <CardDescription>
                  {t("payments.outstandingDescription")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentsTable
                  items={filteredItems}
                  showAdminEarnings={showAdminEarnings}
                  loading={loading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>{t("payments.paymentHistory")}</CardTitle>
                    <CardDescription>{t("payments.historyDescription")}</CardDescription>
                  </div>
                  <Button
                    onClick={processPaymentsNow}
                    disabled={processingPayments}
                    className="flex items-center gap-2"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {processingPayments ? t("payments.processing") : t("payments.processPayments")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {batchesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : batches.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    {t("payments.noBatches")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {batches.map((batch) => (
                      <div key={batch.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{batch.instructor_name}</h3>
                              <span className={`px-2 py-1 text-xs rounded ${
                                batch.status === 'paid'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {t(`payments.${batch.status}`)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                <span className="font-medium">{t("payments.paymentDate")}:</span>{" "}
                                {format(new Date(batch.payment_date), "MMM d, yyyy")}
                              </div>
                              <div>
                                <span className="font-medium">{t("payments.period")}:</span>{" "}
                                {format(new Date(batch.period_start), "MMM d, yyyy")} {t("payments.to")}{" "}
                                {format(new Date(batch.period_end), "MMM d, yyyy")}
                              </div>
                              <div>
                                <span className="font-medium">{t("payments.totalAmount")}:</span>{" "}
                                <span className="text-lg font-bold text-green-600">
                                  ${batch.total_amount.toFixed(2)}
                                </span>
                              </div>
                              {batch.notes && (
                                <div>
                                  <span className="font-medium">{t("payments.notes")}:</span> {batch.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleBatchExpansion(batch.id, batch.expanded || false)}
                          >
                            {batch.expanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                {t("payments.hideDetails")}
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                {t("payments.viewDetails")}
                              </>
                            )}
                          </Button>
                        </div>

                        {batch.expanded && batch.items && (
                          <div className="mt-4 border-t pt-4">
                            <PaymentsTable
                              items={batch.items.map((item) => ({
                                id: item.id,
                                user_name: "",
                                user_email: "",
                                class_name: item.class_name,
                                class_id: "",
                                instructor_id: "",
                                instructor_name: "",
                                session_date: item.session_date,
                                session_time: item.session_time,
                                amount_paid: Number(item.student_paid),
                                instructor_payment: Number(item.instructor_earned),
                                admin_earnings: Number(item.admin_earned),
                                payment_method: "package",
                                enrolled_at: "",
                              }))}
                              showAdminEarnings={showAdminEarnings}
                              loading={false}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("payments.paymentSettings")}</CardTitle>
                <CardDescription>{t("payments.settingsDescription")}</CardDescription>
              </CardHeader>
              <CardContent>
                {settingsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : settings ? (
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("payments.paymentDay")}</label>
                        <Select
                          value={settings.payment_day}
                          onValueChange={(value) => setSettings({ ...settings, payment_day: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monday">{t("payments.monday")}</SelectItem>
                            <SelectItem value="tuesday">{t("payments.tuesday")}</SelectItem>
                            <SelectItem value="wednesday">{t("payments.wednesday")}</SelectItem>
                            <SelectItem value="thursday">{t("payments.thursday")}</SelectItem>
                            <SelectItem value="friday">{t("payments.friday")}</SelectItem>
                            <SelectItem value="saturday">{t("payments.saturday")}</SelectItem>
                            <SelectItem value="sunday">{t("payments.sunday")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">{t("payments.paymentTime")}</label>
                        <div className="flex gap-2">
                          <Select
                            value={String(settings.payment_hour)}
                            onValueChange={(value) => setSettings({ ...settings, payment_hour: Number(value) })}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 24 }, (_, i) => (
                                <SelectItem key={i} value={String(i)}>
                                  {String(i).padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <span className="flex items-center">:</span>
                          <Select
                            value={String(settings.payment_minute)}
                            onValueChange={(value) => setSettings({ ...settings, payment_minute: Number(value) })}
                          >
                            <SelectTrigger className="w-[100px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {[0, 15, 30, 45].map((minute) => (
                                <SelectItem key={minute} value={String(minute)}>
                                  {String(minute).padStart(2, '0')}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{settings.timezone}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="auto-process"
                        checked={settings.auto_process}
                        onCheckedChange={(checked) =>
                          setSettings({ ...settings, auto_process: checked as boolean })
                        }
                      />
                      <label
                        htmlFor="auto-process"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {t("payments.autoProcess")}
                      </label>
                    </div>

                    <Button onClick={saveSettings} disabled={savingSettings}>
                      {savingSettings ? t("common.submitting") : t("payments.saveSettings")}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    {t("payments.settingsError")}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
