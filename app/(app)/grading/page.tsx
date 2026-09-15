import { redirect } from "next/navigation";

export default function GradingRedirect() {
  redirect("/faculty/evaluation");
}
