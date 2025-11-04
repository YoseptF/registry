import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield } from "lucide-react";

export function PrivacyPolicy() {
  const { t } = useTranslation();
  usePageTitle(t("pages.privacyPolicy"));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <Shield className="h-8 w-8 text-indigo-600" />
              <CardTitle className="text-3xl">{t("privacy.title")}</CardTitle>
            </div>
            <p className="text-sm text-gray-500">{t("privacy.lastUpdated")}: {t("privacy.date")}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.intro.title")}</h2>
              <p>{t("privacy.intro.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.dataCollection.title")}</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-2">{t("privacy.dataCollection.account.title")}</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("privacy.dataCollection.account.email")}</li>
                <li>{t("privacy.dataCollection.account.name")}</li>
                <li>{t("privacy.dataCollection.account.google")}</li>
              </ul>
              <h3 className="text-xl font-medium text-gray-800 mb-2 mt-4">{t("privacy.dataCollection.usage.title")}</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("privacy.dataCollection.usage.ip")}</li>
                <li>{t("privacy.dataCollection.usage.browser")}</li>
                <li>{t("privacy.dataCollection.usage.pages")}</li>
                <li>{t("privacy.dataCollection.usage.time")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.dataUse.title")}</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("privacy.dataUse.provide")}</li>
                <li>{t("privacy.dataUse.process")}</li>
                <li>{t("privacy.dataUse.respond")}</li>
                <li>{t("privacy.dataUse.send")}</li>
                <li>{t("privacy.dataUse.protect")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.dataSharing.title")}</h2>
              <p>{t("privacy.dataSharing.content")}</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li><strong>{t("privacy.dataSharing.providers.title")}:</strong> {t("privacy.dataSharing.providers.content")}</li>
                <li><strong>{t("privacy.dataSharing.legal.title")}:</strong> {t("privacy.dataSharing.legal.content")}</li>
                <li><strong>{t("privacy.dataSharing.consent.title")}:</strong> {t("privacy.dataSharing.consent.content")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.security.title")}</h2>
              <p>{t("privacy.security.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.rights.title")}</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li>{t("privacy.rights.access")}</li>
                <li>{t("privacy.rights.correct")}</li>
                <li>{t("privacy.rights.delete")}</li>
                <li>{t("privacy.rights.object")}</li>
                <li>{t("privacy.rights.portability")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.cookies.title")}</h2>
              <p>{t("privacy.cookies.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.retention.title")}</h2>
              <p>{t("privacy.retention.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.thirdParty.title")}</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Supabase:</strong> {t("privacy.thirdParty.supabase")}</li>
                <li><strong>Google OAuth:</strong> {t("privacy.thirdParty.google")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.changes.title")}</h2>
              <p>{t("privacy.changes.content")}</p>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("privacy.contact.title")}</h2>
              <p>{t("privacy.contact.content")}</p>
              <p className="mt-2"><strong>Email:</strong> privacy@clubhouse.com</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
