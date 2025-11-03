import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Drawer } from "@/components/ui/drawer";
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
import {
  Users,
  GraduationCap,
  UserCheck,
  Trash2,
  ChevronRight,
  QrCode,
  ArrowRight,
  Edit,
  Upload,
  X,
} from "lucide-react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useAuth } from "@/contexts/AuthContext";
import type { User, Class } from "@/types";

function ProfileEditDrawer({
  open,
  onClose,
  profile,
  onProfileUpdated,
}: {
  open: boolean;
  onClose: () => void;
  profile: User | null;
  onProfileUpdated: () => void;
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [bio, setBio] = useState(profile?.bio || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    profile?.avatar_url || null
  );
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordSection, setShowPasswordSection] = useState(false);

  useEffect(() => {
    if (profile && open) {
      setName(profile.name || "");
      setPhone(profile.phone || "");
      setAddress(profile.address || "");
      setBio(profile.bio || "");
      setAvatarPreview(profile.avatar_url || null);
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordSection(false);
    }
  }, [profile, open]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Avatar image must be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !profile) return avatarPreview;

    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, { upsert: true });

    if (uploadError) {
      console.error("Error uploading avatar:", uploadError);
      throw new Error("Failed to upload avatar image");
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);
    setError(null);

    try {
      // Validate password if provided
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          setError(t("errors.passwordsDontMatch"));
          setLoading(false);
          return;
        }
        if (newPassword.length < 6) {
          setError(t("errors.passwordTooShort"));
          setLoading(false);
          return;
        }
      }

      let avatarUrl = avatarPreview;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      // Update password if provided
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          name,
          phone: phone || null,
          address: address || null,
          bio: bio || null,
          avatar_url: avatarUrl,
        })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      onProfileUpdated();
      onClose();
    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  return (
    <Drawer open={open} onClose={onClose} title={t("user.editProfile")}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="avatar">{t("user.profilePicture")}</Label>
          {avatarPreview ? (
            <div className="relative w-32 h-32 mx-auto">
              <img
                src={avatarPreview}
                alt="Avatar preview"
                className="w-full h-full object-cover rounded-full"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2"
                onClick={removeAvatar}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <Label
                htmlFor="avatar"
                className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
              >
                {t("user.uploadAvatar")}
              </Label>
              <Input
                id="avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">{t("auth.name")} *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">{t("auth.phone")}</Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">{t("auth.address")}</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">{t("user.bio")}</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t("user.bioPlaceholder")}
            rows={4}
          />
        </div>

        <div className="border-t pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full"
          >
            {showPasswordSection
              ? t("user.hidePasswordSection")
              : t("user.changePassword")}
          </Button>

          {showPasswordSection && (
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("user.newPassword")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("user.enterNewPassword")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {t("user.confirmNewPassword")}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t("user.confirmPasswordPlaceholder")}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {t("user.passwordRequirement")}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-4">
          <Button type="submit" className="flex-1" disabled={loading}>
            {loading ? t("common.loading") : t("user.saveChanges")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {t("admin.cancel")}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}

function ClassDrawer({
  open,
  onClose,
  classInfo,
  users,
  onClassUpdated,
}: {
  open: boolean;
  onClose: () => void;
  classInfo: Class | null;
  users: User[];
  onClassUpdated: () => void;
}) {
  const { t } = useTranslation();
  const [members, setMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (classInfo && open) {
      fetchMembers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchMembers is stable, classInfo?.id is sufficient
  }, [classInfo?.id, open]);

  const fetchMembers = async () => {
    if (!classInfo) return;

    setLoading(true);
    try {
      const { data } = await supabase
        .from("class_memberships")
        .select("user_id")
        .eq("class_id", classInfo.id);

      setMembers(data?.map((m) => m.user_id) || []);
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classInfo || !selectedUserId) return;

    try {
      const { error } = await supabase.from("class_memberships").insert({
        class_id: classInfo.id,
        user_id: selectedUserId,
      });

      if (error) throw error;

      setSelectedUserId("");
      fetchMembers();
    } catch (error) {
      console.error("Error adding user:", error);
    }
  };

  const removeMember = async (userId: string) => {
    if (!classInfo || !confirm("Remove this user from the class?")) return;

    try {
      const { error } = await supabase
        .from("class_memberships")
        .delete()
        .eq("class_id", classInfo.id)
        .eq("user_id", userId);

      if (error) throw error;
      fetchMembers();
    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  const deleteClass = async () => {
    if (!classInfo) return;

    if (!confirm(t("admin.confirmDeleteClass"))) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", classInfo.id);

      if (error) throw error;

      onClose();
      onClassUpdated();
    } catch (error) {
      console.error("Error deleting class:", error);
      alert(t("admin.errorDeletingClass"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!classInfo) return null;

  const enrolledUsers = users.filter((u) => members.includes(u.id));
  const availableUsers = users.filter(
    (u) => !members.includes(u.id) && u.role !== "admin"
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEditing ? t("admin.editClass") : classInfo.name}
    >
      {isEditing ? (
        <div className="space-y-6">
          <ClassForm
            initialData={classInfo}
            onSuccess={() => {
              setIsEditing(false);
              onClassUpdated();
            }}
            onCancel={() => setIsEditing(false)}
          />
          <div className="border-t pt-4">
            <Button
              variant="destructive"
              className="w-full"
              onClick={deleteClass}
              disabled={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? t("common.loading") : t("admin.deleteClass")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-4 h-4 mr-2" />
              {t("admin.editClass")}
            </Button>
          </div>

          {classInfo.banner_url && (
            <div>
              <img
                src={classInfo.banner_url}
                alt={classInfo.name}
                className="w-full h-48 object-cover rounded-lg"
              />
            </div>
          )}

          {classInfo.description && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t("admin.description")}
              </h3>
              <p className="text-sm">{classInfo.description}</p>
            </div>
          )}

          {classInfo.instructor && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t("admin.instructor")}
              </h3>
              <p className="text-sm">{classInfo.instructor}</p>
            </div>
          )}

          {(classInfo.schedule_days && classInfo.schedule_days.length > 0) ||
          classInfo.schedule_time ||
          classInfo.duration_minutes ? (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t("admin.schedule")}
              </h3>
              <p className="text-sm">
                {classInfo.schedule_days &&
                  classInfo.schedule_days.length > 0 && (
                    <span>
                      {classInfo.schedule_days
                        .map((day) => t(`admin.${day}`))
                        .join(", ")}
                    </span>
                  )}
                {classInfo.schedule_time && (
                  <span>
                    {" "}
                    {t("admin.at")} {classInfo.schedule_time}
                  </span>
                )}
                {classInfo.duration_minutes && (
                  <span>
                    {" "}
                    ({classInfo.duration_minutes} {t("admin.minutes")})
                  </span>
                )}
              </p>
            </div>
          ) : classInfo.schedule ? (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                {t("admin.schedule")}
              </h3>
              <p className="text-sm">{classInfo.schedule}</p>
            </div>
          ) : null}

          <div className="border-t pt-6 pb-6">
            <Link to={`/checkin/${classInfo.id}`}>
              <Button className="w-full bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white rounded-full py-6 text-lg font-semibold shadow-lg group">
                <QrCode className="mr-2 w-5 h-5" />
                {t("admin.startCheckIn")}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-2 transition-transform" />
              </Button>
            </Link>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {t("admin.addUserToClass")}
            </h3>
            <form onSubmit={addMember} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="selectUser">{t("admin.selectUser")}</Label>
                <select
                  id="selectUser"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  <option value="">{t("admin.chooseUser")}</option>
                  {availableUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              <Button type="submit" className="w-full">
                {t("admin.addUser")}
              </Button>
            </form>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">
              {t("admin.enrolledUsers")} ({enrolledUsers.length})
            </h3>
            {loading ? (
              <div className="text-sm text-muted-foreground">
                {t("common.loading")}
              </div>
            ) : enrolledUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("admin.noUsersEnrolled")}
              </p>
            ) : (
              <div className="space-y-2">
                {enrolledUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    </div>
                    <button
                      onClick={() => removeMember(user.id)}
                      className="text-destructive hover:text-destructive/80 p-2 rounded-md hover:bg-destructive/10"
                      title={t("admin.removeFromClass")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}

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

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [usersResult, classesResult, checkInsResult] = await Promise.all([
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
      ]);

      setUsers((usersResult.data as User[]) || []);
      setClasses(classesResult.data || []);
      setTodaysCheckIns(checkInsResult.count || 0);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-pink-50 to-white dark:from-gray-900 dark:to-gray-800">
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
          users={users}
          onClassUpdated={fetchAdminData}
        />
      </div>
    </div>
  );
}
