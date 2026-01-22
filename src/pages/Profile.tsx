import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useSystemUser } from "@/hooks/use-system-user";
import ProfileHeaderCard from "@/components/profile/ProfileHeaderCard";
import UserProfileForm from "@/components/profile/UserProfileForm";
import UserSubscriptionPanel from "@/components/profile/UserSubscriptionPanel";
import { Button } from "@/components/ui/button";

export default function Profile() {
  const navigate = useNavigate();
  const { loading } = useSystemUser();

  return (
    <div className="relative min-h-screen w-full bg-[radial-gradient(circle_at_0%_0%,rgba(254,230,122,0.10)_0,rgba(18,18,18,1)_55%),radial-gradient(circle_at_100%_100%,rgba(212,160,23,0.08)_0,rgba(18,18,18,1)_55%)] text-foreground">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-full"
            onClick={() => navigate(-1)}
            disabled={loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <span className="text-xs text-muted-foreground">
            Perfil e assinatura
          </span>
        </div>

        <ProfileHeaderCard planLabel={null} />

        <div className="grid gap-4 lg:grid-cols-2">
          <UserProfileForm />
          <UserSubscriptionPanel />
        </div>
      </div>
    </div>
  );
}