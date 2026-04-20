import { useNavigate } from "react-router-dom";
import { V2Shell } from "@/components/v2/V2Shell";
import { ShieldOff, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <V2Shell
      title="Access Denied"
      titleIcon={<ShieldOff className="h-5 w-5 text-muted-foreground" />}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <ShieldOff className="h-12 w-12 opacity-20 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Not Authorized</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You don't have permission to access this page. Contact your
          administrator if you think this is a mistake.
        </p>
        <Button onClick={() => navigate("/")} className="gap-1.5">
          <Home className="h-4 w-4" />
          Go to Home
        </Button>
      </div>
    </V2Shell>
  );
}
