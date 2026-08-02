import { Suspense } from "react";
import { StyleSurveyScreen } from "@/features/onboarding/StyleSurveyScreen";

export default function StyleSurveyPage() {
  return (
    <Suspense>
      <StyleSurveyScreen />
    </Suspense>
  );
}
