import { useTranslation } from "react-i18next";

function Equipements() {
  const { t } = useTranslation();

  return <div>{t("page_equipements_a_implementer")}</div>;
}
export default Equipements;
