import { useTranslation } from "react-i18next";
import { usePageTitle } from "@/hooks/usePageTitle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Link } from "react-router-dom";

export function TermsOfService() {
  const { t } = useTranslation();
  usePageTitle(t("pages.termsOfService"));

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-4">
              <FileText className="h-8 w-8 text-indigo-600" />
              <CardTitle className="text-3xl">{t("terms.title")}</CardTitle>
            </div>
            <p className="text-sm text-gray-500">{t("terms.lastUpdated")}: {t("terms.date")}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.acceptance.title")}</h2>
              <p>{t("terms.acceptance.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.description.title")}</h2>
              <p>{t("terms.description.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.registration.title")}</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-2">{t("terms.registration.eligibility.title")}</h3>
              <p>{t("terms.registration.eligibility.content")}</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>{t("terms.registration.eligibility.accurate")}</li>
                <li>{t("terms.registration.eligibility.maintain")}</li>
                <li>{t("terms.registration.eligibility.legal")}</li>
              </ul>
              <h3 className="text-xl font-medium text-gray-800 mb-2 mt-4">{t("terms.registration.security.title")}</h3>
              <p>{t("terms.registration.security.content")}</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>{t("terms.registration.security.confidential")}</li>
                <li>{t("terms.registration.security.responsible")}</li>
                <li>{t("terms.registration.security.notify")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.acceptable.title")}</h2>
              <p>{t("terms.acceptable.content")}</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>{t("terms.acceptable.laws")}</li>
                <li>{t("terms.acceptable.ip")}</li>
                <li>{t("terms.acceptable.illegal")}</li>
                <li>{t("terms.acceptable.virus")}</li>
                <li>{t("terms.acceptable.reverse")}</li>
                <li>{t("terms.acceptable.spam")}</li>
                <li>{t("terms.acceptable.impersonate")}</li>
              </ul>
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
                <p className="text-yellow-700"><strong>{t("terms.acceptable.important.title")}:</strong> {t("terms.acceptable.important.content")}</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.ip.title")}</h2>
              <p>{t("terms.ip.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.userContent.title")}</h2>
              <h3 className="text-xl font-medium text-gray-800 mb-2">{t("terms.userContent.responsibility.title")}</h3>
              <p>{t("terms.userContent.responsibility.content")}</p>
              <h3 className="text-xl font-medium text-gray-800 mb-2 mt-4">{t("terms.userContent.license.title")}</h3>
              <p>{t("terms.userContent.license.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.privacy.title")}</h2>
              <p>
                {t("terms.privacy.content")}{" "}
                <Link to="/privacy-policy" className="text-indigo-600 hover:text-indigo-800 underline">
                  {t("terms.privacy.link")}
                </Link>
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.termination.title")}</h2>
              <p>{t("terms.termination.content")}</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>{t("terms.termination.violation")}</li>
                <li>{t("terms.termination.request")}</li>
                <li>{t("terms.termination.business")}</li>
                <li>{t("terms.termination.notice")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.disclaimer.title")}</h2>
              <p>{t("terms.disclaimer.content")}</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>{t("terms.disclaimer.uninterrupted")}</li>
                <li>{t("terms.disclaimer.corrected")}</li>
                <li>{t("terms.disclaimer.virus")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.limitation.title")}</h2>
              <p>{t("terms.limitation.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.indemnification.title")}</h2>
              <p>{t("terms.indemnification.content")}</p>
              <ul className="list-disc pl-6 space-y-1 mt-2">
                <li>{t("terms.indemnification.use")}</li>
                <li>{t("terms.indemnification.violation")}</li>
                <li>{t("terms.indemnification.rights")}</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.modifications.title")}</h2>
              <p>{t("terms.modifications.content")}</p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.governing.title")}</h2>
              <p>{t("terms.governing.content")}</p>
            </section>

            <section className="bg-gray-50 p-6 rounded-lg">
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t("terms.contact.title")}</h2>
              <p>{t("terms.contact.content")}</p>
              <p className="mt-2"><strong>Email:</strong> legal@clubhouse.com</p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
