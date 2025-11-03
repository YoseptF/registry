import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

interface PaymentLineItem {
  id: string;
  user_name: string;
  user_email: string;
  class_name: string;
  session_date: string;
  session_time: string;
  instructor_name: string;
  package_name?: string;
  amount_paid: number;
  instructor_payment: number;
  admin_earnings: number;
}

interface PaymentsTableProps {
  items: PaymentLineItem[];
  showAdminEarnings: boolean;
  loading?: boolean;
}

export function PaymentsTable({ items, showAdminEarnings, loading }: PaymentsTableProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
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
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showAdminEarnings ? 8 : 7} className="text-center text-gray-500 py-8">
                {t("payments.noPayments")}
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
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
                <TableCell className="text-sm">{item.package_name || "-"}</TableCell>
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
  );
}
