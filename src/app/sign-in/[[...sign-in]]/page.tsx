import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return (
      <main style={{ margin: "80px auto", maxWidth: 520, padding: "0 24px" }}>
        <h1>Clerk is not configured yet.</h1>
        <p style={{ color: "#777a83", lineHeight: 1.6 }}>
          Add the Clerk keys from <code>.env.example</code> to enable sign in.
        </p>
      </main>
    );
  }

  return <SignIn fallbackRedirectUrl="/" />;
}
