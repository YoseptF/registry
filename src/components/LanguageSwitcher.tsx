import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Languages } from "lucide-react";

interface LanguageSwitcherProps {
  inline?: boolean;
}

export function LanguageSwitcher({ inline = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const languages = [
    { code: "en", label: "English", flag: "🇺🇸" },
    { code: "es", label: "Español", flag: "🇲🇽" },
  ];

  const currentLanguage =
    languages.find((lang) => lang.code === i18n.language) || languages[0];

  const toggleLanguage = () => {
    const nextIndex =
      (languages.findIndex((lang) => lang.code === i18n.language) + 1) %
      languages.length;
    i18n.changeLanguage(languages[nextIndex].code);
  };

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className={`gap-2 ${inline ? '' : 'fixed top-4 right-4 z-50'}`}
      title={`Switch to ${
        languages.find((l) => l.code !== i18n.language)?.label
      }`}
    >
      <Languages className="w-4 h-4" />
      <span>{currentLanguage.flag}</span>
      <span className="hidden sm:inline">{currentLanguage.label}</span>
    </Button>
  );
}
