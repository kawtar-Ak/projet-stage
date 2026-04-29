import React, { useState } from "react";
import GererCourriers from "./GererCourriers";
import GererCourriersJuridiques from "./GererCourriersJuridiques";

const OPTION_ADMINISTRATIF = "administratif";
const OPTION_JURIDIQUE = "juridique";

function GestionCourriers() {
  const [selectedOption, setSelectedOption] = useState(OPTION_ADMINISTRATIF);

  return (
    <div>
      <div className="page-container">
        <h1 className="page-title">تدبير المراسلات</h1>

        <div className="registry-choice">
          <button
            type="button"
            className={selectedOption === OPTION_ADMINISTRATIF ? "choice-pill active" : "choice-pill"}
            onClick={() => setSelectedOption(OPTION_ADMINISTRATIF)}
          >
            تدبير المراسلات الإدارية
          </button>
          <button
            type="button"
            className={selectedOption === OPTION_JURIDIQUE ? "choice-pill active" : "choice-pill"}
            onClick={() => setSelectedOption(OPTION_JURIDIQUE)}
          >
            تدبير المراسلات القضائية
          </button>
        </div>
      </div>

      {selectedOption === OPTION_ADMINISTRATIF ? (
        <GererCourriers />
      ) : (
        <GererCourriersJuridiques />
      )}
    </div>
  );
}

export default GestionCourriers;
