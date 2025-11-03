import { useTranslation } from "react-i18next";
import { ClassSessionCalendar } from "@/components/ClassSessionCalendar";
import { Calendar } from "lucide-react";

export default function UserCalendar() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-600 to-purple-600 flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
              {t("user.myCalendar")}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {t("user.viewSchedule")}
            </p>
          </div>
        </div>
      </div>

      <ClassSessionCalendar />
    </div>
  );
}
