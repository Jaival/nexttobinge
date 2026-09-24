import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    // dvh, not vh: 100vh is the viewport with the browser chrome collapsed, so
    // it overflows by the height of the URL bar on load.
    <div
      className="flex min-h-dvh items-center justify-center bg-background p-4"
      style={{
        paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      <SignUp />
    </div>
  );
}
