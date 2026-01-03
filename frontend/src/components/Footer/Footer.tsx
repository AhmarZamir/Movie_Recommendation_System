export default function Footer() {
  return (
    <footer className="mt-10 border-t border-white/5 bg-transparent">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="text-sm font-extrabold">MovieStream</div>
            <div className="mt-2 text-xs text-white/55">About Us</div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white/80">Support</div>
            <div className="mt-2 space-y-2 text-xs text-white/55">
              <div>Help Center</div>
              <div>Contact Us</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white/80">Legal</div>
            <div className="mt-2 space-y-2 text-xs text-white/55">
              <div>Terms of Service</div>
              <div>Privacy Policy</div>
              <div>Cookie Settings</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-[11px] text-white/35">
          © 2025 CinematicAI. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
