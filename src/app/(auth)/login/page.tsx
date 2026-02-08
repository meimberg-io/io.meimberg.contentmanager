"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroBg from "@/assets/hero-bg.jpg";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard" });
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBg.src})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background/90" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo Section */}
        <div className="text-center space-y-4 animate-fade-in">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary gold-glow">
            <span className="font-display text-4xl font-bold text-primary-foreground">M</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">
              meimberg.io Contentmanager
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage Your Blog Content
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="glass-card border-border/50 animate-slide-up backdrop-blur-xl" style={{ animationDelay: "100ms" }}>
          <CardContent className="pt-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-display text-2xl font-semibold">Welcome Back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in with your Google account to manage your blog content
              </p>
            </div>

            <Button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full h-12 gap-3 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {isLoading ? "Signing in..." : "Sign in with Google"}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-2 text-muted-foreground">
                  Secure authentication
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Only authorized email addresses can access this application
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center space-y-1 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <p className="text-xs text-muted-foreground">v1.0.0</p>
          <p className="text-xs text-muted-foreground">© 2025 meimberg.io</p>
        </div>
      </div>
    </div>
  );
}
