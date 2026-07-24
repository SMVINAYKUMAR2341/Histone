import { useState } from "react";
import { api } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Mail, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function EmailReferralDialog({ assessmentId, emailConfigured, defaultSubject, trigger }) {
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [note, setNote] = useState("");
  const [subject, setSubject] = useState(defaultSubject || "");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!to || !to.includes("@")) {
      toast.error("Recipient email is required");
      return;
    }
    setSending(true);
    try {
      const r = await api.post(`/assessments/${assessmentId}/email`, {
        to, cc: cc || null, subject: subject || null, note: note || null,
      });
      toast.success(`Referral sent to ${r.data.to}`);
      setOpen(false);
      setTo(""); setCc(""); setNote("");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Email failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button data-testid="open-email-dialog-btn" onClick={() => setOpen(true)} className="w-full">
        {trigger}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email referral PDF</DialogTitle>
            <DialogDescription>
              Sends the referral summary PDF as an attachment to the target clinic.
            </DialogDescription>
          </DialogHeader>
          {!emailConfigured ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="flex items-center gap-2 font-heading font-semibold">
                <AlertCircle className="w-4 h-4" /> Email is not configured yet
              </div>
              <p className="mt-2 leading-relaxed">
                Ask your admin to set <code className="font-mono text-[12px]">GMAIL_ADDRESS</code> and
                <code className="font-mono text-[12px]"> GMAIL_APP_PASSWORD</code> in
                <code className="font-mono text-[12px]"> backend/.env</code>. Create a Gmail App
                Password at
                <a
                  className="underline text-brand ml-1"
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noreferrer"
                >
                  myaccount.google.com/apppasswords
                </a>.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="em-to">To (genetic counselor / clinic email)</Label>
                <Input
                  id="em-to"
                  data-testid="email-to-input"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="counselor@genetics-clinic.com"
                  className="mt-1.5 h-10"
                />
              </div>
              <div>
                <Label htmlFor="em-cc">CC (optional, comma separated)</Label>
                <Input
                  id="em-cc"
                  data-testid="email-cc-input"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  className="mt-1.5 h-10"
                />
              </div>
              <div>
                <Label htmlFor="em-subject">Subject (optional — auto-generated)</Label>
                <Input
                  id="em-subject"
                  data-testid="email-subject-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Auto-generated from pathway + urgency"
                  className="mt-1.5 h-10"
                />
              </div>
              <div>
                <Label htmlFor="em-note">Note to counselor (optional)</Label>
                <Textarea
                  id="em-note"
                  data-testid="email-note-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={4}
                  placeholder="e.g. Patient prefers Tuesday afternoons; interpreter needed"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              data-testid="send-email-btn"
              disabled={!emailConfigured || sending}
              onClick={send}
              className="bg-brand hover:bg-brand text-white"
            >
              <Mail className="w-4 h-4 mr-1.5" />
              {sending ? "Sending…" : "Send referral"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
