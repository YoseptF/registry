import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Navigation } from "@/components/Navigation";
import { ProfileEditDrawer } from "@/components/ProfileEditDrawer";
import { ClassDrawer } from "@/components/ClassDrawer";
import { QRCodeSVG } from "qrcode.react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
  Edit,
  Upload,
  X,
  Clock,
  GraduationCap,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import type { Class, CheckIn, User as UserType } from "@/types";
import { format } from "date-fns";

export function UserDashboard() {
  const { t } = useTranslation();
  usePageTitle("pages.userDashboard");
  const { profile, refreshProfile } = useAuth();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [classMap, setClassMap] = useState<Record<string, string>>({});
  const [packagePurchases, setPackagePurchases] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);

  useEffect(() => {
    if (profile) {
      fetchUserData();
      subscribeToCheckIns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchUserData and subscribeToCheckIns are stable
  }, [profile]);

  const fetchUserData = async () => {
    if (!profile) return;

    try {
      // Fetch package purchases
      const { data: packageData } = await supabase
        .from("class_package_purchases")
        .select("*")
        .eq("user_id", profile.id)
        .order("purchase_date", { ascending: false });

      setPackagePurchases(packageData || []);

      // Fetch enrollments with class and session details
      const { data: enrollmentData } = await supabase
        .from("class_enrollments")
        .select(
          `
          id,
          checked_in,
          enrolled_at,
          package_purchase_id,
          class_session:class_sessions(
            id,
            session_date,
            session_time,
            class:classes(
              id,
              name,
              description,
              banner_url,
              instructor_id,
              schedule_days,
              schedule_time,
              duration_minutes,
              created_by,
              created_at
            )
          )
        `
        )
        .eq("user_id", profile.id)
        .order("enrolled_at", { ascending: false });

      setEnrollments(enrollmentData || []);

      const { data: checkInData } = await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", profile.id)
        .order("checked_in_at", { ascending: false })
        .limit(10);
      setCheckIns(checkInData || []);

      const uniqueClassIds = [
        ...new Set(checkInData?.map((ci) => ci.class_id) || []),
      ];
      if (uniqueClassIds.length > 0) {
        const { data: allClasses } = await supabase
          .from("classes")
          .select("id, name")
          .in("id", uniqueClassIds);

        const map: Record<string, string> = {};
        allClasses?.forEach((cls) => {
          map[cls.id] = cls.name;
        });
        setClassMap(map);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToCheckIns = () => {
    if (!profile) return;

    const channel = supabase
      .channel("user_check_ins_dashboard")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "check_ins",
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          const newCheckIn = payload.new as CheckIn;

          const { data: classData } = await supabase
            .from("classes")
            .select("name")
            .eq("id", newCheckIn.class_id)
            .single();

          setCheckIns((prev) => [newCheckIn, ...prev].slice(0, 10));

          if (classData) {
            setClassMap((prev) => ({
              ...prev,
              [newCheckIn.class_id]: classData.name,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const generateQRData = () => {
    if (!profile) return "";
    return JSON.stringify({
      userId: profile.id,
      name: profile.name,
      timestamp: Date.now(),
    });
  };

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls);
    setIsDrawerOpen(true);
  };

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
            {t("user.dashboard")}
          </h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>{t("user.profile")}</CardTitle>
                <CardDescription>{t("user.myProfile")}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileEditOpen(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t("user.edit")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-center mb-4">
                <Avatar
                  src={profile?.avatar_url}
                  alt={profile?.name || "User"}
                  fallbackText={profile?.name || profile?.email || "User"}
                  size="lg"
                  className="border-4 border-primary/20"
                />
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span>{profile?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{profile?.email}</span>
              </div>
              {profile?.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.phone}</span>
                </div>
              )}
              {profile?.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>{profile.address}</span>
                </div>
              )}
              {profile?.bio && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">{profile.bio}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("user.myQrCode")}</CardTitle>
              <CardDescription>{t("user.qrCodeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={generateQRData()}
                  size={200}
                  level="H"
                  includeMargin
                  imageSettings={{
                    src: "/qr-center.png",
                    height: 40,
                    width: 40,
                    excavate: true,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Package Purchases Section */}
        {packagePurchases.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{t("user.myPackages")}</CardTitle>
                <CardDescription>{t("user.myPackagesDesc")}</CardDescription>
              </div>
              <Link to="/user/calendar">
                <Button variant="outline" size="sm">
                  {t("user.viewCalendar")}
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {packagePurchases.map((pkg) => {
                  const pkgEnrollments = enrollments.filter(
                    (e: any) => e.package_purchase_id === pkg.id
                  );
                  return (
                    <div
                      key={pkg.id}
                      className="p-4 border rounded-lg bg-gradient-to-r from-pink-50 to-purple-50"
                    >
                      <div className="mb-3">
                        <h3 className="font-semibold text-lg">
                          {pkg.package_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {t("user.purchased")}{" "}
                          {format(new Date(pkg.purchase_date), "PPP")}
                        </p>
                      </div>

                      {pkgEnrollments.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase">
                            {t("user.scheduledSessions")}
                          </p>
                          {pkgEnrollments.map((enrollment: any) => (
                            <button
                              key={enrollment.id}
                              onClick={() => {
                                if (enrollment.class_session?.class) {
                                  handleClassClick(
                                    enrollment.class_session.class
                                  );
                                }
                              }}
                              className="w-full flex items-center justify-between p-2 bg-white rounded text-sm hover:bg-gray-50 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {enrollment.class_session?.class?.name}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-muted-foreground">
                                  {(() => {
                                    const [year, month, day] =
                                      enrollment.class_session?.session_date
                                        .split("-")
                                        .map(Number);
                                    const sessionDate = new Date(
                                      year,
                                      month - 1,
                                      day
                                    );
                                    return format(sessionDate, "MMM d, yyyy");
                                  })()}{" "}
                                  at {enrollment.class_session?.session_time}
                                </div>
                                {enrollment.checked_in && (
                                  <span className="text-xs text-green-600">
                                    ✓ {t("user.checkedIn")}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("landing.ourClasses")}</CardTitle>
              <CardDescription>{t("user.browseClassesDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/classes">
                <Button className="w-full" variant="outline" size="lg">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  {t("landing.viewAllClasses")}
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle>{t("user.recentCheckIns")}</CardTitle>
                <CardDescription>{t("user.checkInsDesc")}</CardDescription>
              </div>
              <Link to="/check-ins-history">
                <Button variant="outline" size="sm">
                  {t("user.viewAll")}
                  <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {checkIns.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {t("user.noCheckIns")}
                </p>
              ) : (
                <div className="space-y-2">
                  {checkIns.map((checkIn) => (
                    <div
                      key={checkIn.id}
                      className="p-3 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="text-sm font-medium">
                        {format(new Date(checkIn.checked_in_at), "PPp")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {classMap[checkIn.class_id] || t("user.unknownClass")}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <ProfileEditDrawer
          open={isProfileEditOpen}
          onClose={() => setIsProfileEditOpen(false)}
          profile={profile}
          onProfileUpdated={refreshProfile}
        />

        <ClassDrawer
          open={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          classInfo={selectedClass}
          mode="user"
        />
      </div>
    </div>
  );
}
