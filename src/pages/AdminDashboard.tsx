import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
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
import { Avatar } from "@/components/ui/avatar";
import { ClassForm } from "@/components/ClassForm";
import { Navigation } from "@/components/Navigation";
import { RecentCheckInsCard } from "@/components/RecentCheckInsCard";
import { ProfileEditDrawer } from "@/components/ProfileEditDrawer";
import { ClassDrawer } from "@/components/ClassDrawer";
import {
  Users,
  GraduationCap,
  UserCheck,
  ChevronRight,
  Edit,
  RefreshCw,
  Check,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import type { User, Class } from "@/types";

export function AdminDashboard() {
  const { t } = useTranslation();
  usePageTitle("pages.adminDashboard");
  const { user: currentUser, profile, refreshProfile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [todaysCheckIns, setTodaysCheckIns] = useState(0);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<Class | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [rescheduleRequests, setRescheduleRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [usersResult, classesResult, checkInsResult, rescheduleResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("classes")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("check_ins")
          .select("id", { count: "exact" })
          .gte("checked_in_at", today.toISOString()),
        supabase
          .from("reschedule_requests")
          .select(`
            *,
            user:profiles!reschedule_requests_user_id_fkey(name, email),
            current_session:class_sessions!reschedule_requests_current_session_id_fkey(
              session_date,
              session_time,
              class:classes(name)
            ),
            requested_session:class_sessions!reschedule_requests_requested_session_id_fkey(
              session_date,
              session_time,
              class:classes(name)
            )
          `)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
      ]);

      setUsers((usersResult.data as User[]) || []);
      setClasses(classesResult.data || []);
      setTodaysCheckIns(checkInsResult.count || 0);
      setRescheduleRequests(rescheduleResult.data || []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClassClick = (cls: Class) => {
    setSelectedClass(cls);
    setIsDrawerOpen(true);
  };

  const updateUserRole = async (
    userId: string,
    newRole: "admin" | "instructor" | "user"
  ) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      setUsers((prevUsers) =>
        prevUsers.map((user) =>
          user.id === userId ? { ...user, role: newRole } : user
        )
      );
    } catch (error) {
      console.error("Error updating user role:", error);
      alert(t("admin.errorUpdatingRole"));
    }
  };

  const handleRescheduleRequest = async (requestId: string, action: "approved" | "rejected", adminNotes?: string) => {
    try {
      const request = rescheduleRequests.find(r => r.id === requestId);
      if (!request) return;

      // Update the reschedule request status
      const { error: updateError } = await supabase
        .from("reschedule_requests")
        .update({
          status: action,
          processed_by: currentUser?.id,
          processed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If approved, update the enrollment to point to the new session
      if (action === "approved") {
        const { error: enrollmentError } = await supabase
          .from("class_enrollments")
          .update({
            class_session_id: request.requested_session_id,
          })
          .eq("id", request.enrollment_id);

        if (enrollmentError) throw enrollmentError;
      }

      // Remove from pending list
      setRescheduleRequests(prev => prev.filter(r => r.id !== requestId));

      alert(action === "approved" ? t("reschedule.requestApproved") : t("reschedule.requestRejected"));
    } catch (error) {
      console.error("Error processing reschedule request:", error);
      alert(t("reschedule.processError"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-white">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-start">
          <h1 className="text-4xl font-bold bg-linear-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            {t("admin.dashboard")}
          </h1>
          <Button variant="outline" onClick={() => setIsProfileEditOpen(true)}>
            <Edit className="w-4 h-4 mr-2" />
            {t("user.editProfile")}
          </Button>
        </div>

        {profile && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{t("user.profile")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Avatar
                  src={profile.avatar_url}
                  alt={profile.name}
                  fallbackText={profile.name || profile.email}
                  size="lg"
                  className="border-4 border-primary/20"
                />
                <div>
                  <h3 className="text-xl font-semibold">{profile.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.email}
                  </p>
                  <p className="text-xs text-primary font-medium mt-1 capitalize">
                    {profile.role}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.totalUsers")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.totalClasses")}
              </CardTitle>
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{classes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("admin.todaysCheckIns")}
              </CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todaysCheckIns}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reschedule Requests Section */}
        {rescheduleRequests.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                <CardTitle>{t("reschedule.viewRequests")}</CardTitle>
              </div>
              <CardDescription>
                {rescheduleRequests.length} {t("reschedule.pending")} {rescheduleRequests.length === 1 ? 'request' : 'requests'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rescheduleRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg bg-gradient-to-r from-orange-50 to-yellow-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{request.user?.name || request.user?.email}</h4>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(request.created_at), "PPp")}
                        </p>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-3">
                      <div className="p-3 bg-white rounded">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t("reschedule.currentSession")}
                        </p>
                        <p className="font-medium">{request.current_session?.class?.name}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {(() => {
                              const [year, month, day] = request.current_session?.session_date.split('-').map(Number);
                              return format(new Date(year, month - 1, day), "MMM d, yyyy");
                            })()} at{" "}
                            {request.current_session?.session_time}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t("reschedule.requestedSession")}
                        </p>
                        <p className="font-medium">{request.requested_session?.class?.name}</p>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <Clock className="w-3 h-3" />
                          <span>
                            {(() => {
                              const [year, month, day] = request.requested_session?.session_date.split('-').map(Number);
                              return format(new Date(year, month - 1, day), "MMM d, yyyy");
                            })()} at{" "}
                            {request.requested_session?.session_time}
                          </span>
                        </div>
                      </div>
                    </div>

                    {request.reason && (
                      <div className="mb-3 p-3 bg-white rounded">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          {t("reschedule.reason")}
                        </p>
                        <p className="text-sm">{request.reason}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRescheduleRequest(request.id, "approved")}
                        className="flex-1"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        {t("reschedule.approveRequest")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRescheduleRequest(request.id, "rejected")}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        {t("reschedule.rejectRequest")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t("admin.classes")}</CardTitle>
                <CardDescription>{t("admin.manageClasses")}</CardDescription>
              </div>
              <Button
                onClick={() => setShowCreateClass(!showCreateClass)}
                size="sm"
              >
                {showCreateClass ? t("admin.cancel") : t("admin.newClass")}
              </Button>
            </CardHeader>
            <CardContent>
              {showCreateClass && (
                <div className="mb-4 p-4 border rounded-lg">
                  <ClassForm
                    onSuccess={() => {
                      setShowCreateClass(false);
                      fetchAdminData();
                    }}
                    onCancel={() => setShowCreateClass(false)}
                  />
                </div>
              )}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {classes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    {t("user.noClasses")}
                  </p>
                ) : (
                  classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => handleClassClick(cls)}
                      className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-semibold">{cls.name}</div>
                          {cls.description && (
                            <div className="text-sm text-muted-foreground">
                              {cls.description}
                            </div>
                          )}
                          {cls.instructor && (
                            <div className="text-xs text-muted-foreground">
                              {t("admin.instructor")}: {cls.instructor}
                            </div>
                          )}
                          {cls.schedule && (
                            <div className="text-xs text-muted-foreground">
                              {cls.schedule}
                            </div>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <RecentCheckInsCard />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("admin.allUsers")}</CardTitle>
            <CardDescription>{t("admin.userManagement")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="text-xs text-muted-foreground">
                          {user.phone}
                        </div>
                      )}
                    </div>
                    <div className="flex-shrink-0 w-32">
                      <Select
                        value={user.role}
                        onValueChange={(value) =>
                          updateUserRole(
                            user.id,
                            value as "admin" | "instructor" | "user"
                          )
                        }
                        disabled={user.id === currentUser?.id}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            {t("admin.roleUser")}
                          </SelectItem>
                          <SelectItem value="instructor">
                            {t("admin.roleInstructor")}
                          </SelectItem>
                          <SelectItem value="admin">
                            {t("admin.roleAdmin")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      {user.id === currentUser?.id && (
                        <div className="text-xs text-muted-foreground mt-1 text-center">
                          {t("admin.cannotChangeOwnRole")}
                        </div>
                      )}
                    </div>
                  </div>
                  {user.bio && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      {user.bio}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
          mode="admin"
          users={users}
          onClassUpdated={fetchAdminData}
        />
      </div>
    </div>
  );
}
