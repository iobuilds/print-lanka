import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Phone, KeyRound, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";

type Step = 'phone' | 'otp' | 'password';

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const navigate = useNavigate();

  // Format phone for display (local format)
  const formatPhoneDisplay = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/[^0-9]/g, "");
    // Limit to 10 digits
    return digits.slice(0, 10);
  };

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendOtp = async () => {
    const digits = phone.replace(/[^0-9]/g, "");
    if (!phone || digits.length < 9) {
      toast.error("Please enter a valid phone number (e.g., 0771234567)");
      return;
    }

    setIsSendingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-otp", {
        body: { phone, purpose: 'forgot_password' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("OTP sent to your phone!");
      setStep('otp');
      setCountdown(60);
    } catch (error: any) {
      toast.error(error.message || "Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-otp", {
        body: { phone, otp_code: otpCode },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSessionId(data.session_id);
      setIsVerified(true);
      toast.success("Phone verified!");
      
      setTimeout(() => {
        setStep('password');
      }, 1000);
    } catch (error: any) {
      toast.error(error.message || "Failed to verify OTP");
      setOtpCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("reset-password", {
        body: { 
          phone, 
          new_password: newPassword,
          session_id: sessionId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Password reset successfully! Please sign in.");
      navigate("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout showFooter={false}>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-secondary/30">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src={logo} alt="IO Builds Logo" className="h-16 w-auto" />
            </div>
            <CardTitle className="font-display text-2xl">Reset Password</CardTitle>
            <CardDescription>
              {step === 'phone' && "Enter your phone number to reset your password"}
              {step === 'otp' && "Enter the verification code sent to your phone"}
              {step === 'password' && "Create a new password for your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Step 1: Phone Number */}
            {step === 'phone' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0771234567"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneDisplay(e.target.value))}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the phone number associated with your account
                  </p>
                </div>
                <Button
                  type="button"
                  className="w-full bg-primary-gradient"
                  onClick={handleSendOtp}
                  disabled={isSendingOtp || !phone}
                >
                  {isSendingOtp ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Phone className="w-4 h-4 mr-2" />
                  )}
                  Send OTP
                </Button>
              </div>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <div className="space-y-6">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{phone}</span>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 h-auto text-primary"
                    onClick={() => {
                      setStep('phone');
                      setOtpCode("");
                      setIsVerified(false);
                    }}
                  >
                    Change
                  </Button>
                </div>

                {isVerified ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="font-medium text-green-600">Phone Verified!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col items-center gap-4">
                      <InputOTP
                        maxLength={6}
                        value={otpCode}
                        onChange={setOtpCode}
                      >
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <p className="text-xs text-muted-foreground">
                        Code expires in 5 minutes
                      </p>
                    </div>

                    <Button
                      type="button"
                      className="w-full bg-primary-gradient"
                      onClick={handleVerifyOtp}
                      disabled={isVerifying || otpCode.length !== 6}
                    >
                      {isVerifying ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Verify
                    </Button>

                    <div className="text-center">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={handleSendOtp}
                        disabled={countdown > 0 || isSendingOtp}
                        className="text-muted-foreground"
                      >
                        {countdown > 0
                          ? `Resend code in ${countdown}s`
                          : "Resend code"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3: New Password */}
            {step === 'password' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-700">
                    Phone verified: {phone}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-primary-gradient"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <KeyRound className="w-4 h-4 mr-2" />
                  )}
                  Reset Password
                </Button>
              </form>
            )}

            <div className="flex items-center justify-center mt-4">
              <Link
                to="/login"
                className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
