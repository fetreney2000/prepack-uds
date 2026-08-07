import { redirect } from "next/navigation";

// Root path → dashboard (matching original's landing on Papan Pemuka)
export default function Home() {
  redirect("/dashboard");
}