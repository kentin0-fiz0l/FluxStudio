import { Link } from 'react-router-dom';

export function Terms() {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#1a1a1a] px-4 py-12">
      {/* Header */}
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-xl font-bold text-neutral-900 dark:text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">Flux</span>Studio
          </span>
        </Link>

        {/* Content */}
        <div className="bg-white dark:bg-[#242424] rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500" />

          <div className="p-8 md:p-12">
            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Terms of Service</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mb-8">Last updated: February 2026</p>

            <div className="prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">1. Acceptance of Terms</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  By accessing or using FluxStudio ("the Service"), you agree to be bound by these Terms of Service.
                  If you do not agree to these terms, please do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">2. Description of Service</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  FluxStudio is a creative collaboration platform that enables design teams to work together in real-time,
                  manage projects, and streamline their creative workflows.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">3. User Accounts</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  You are responsible for maintaining the confidentiality of your account credentials and for all
                  activities that occur under your account. You must notify us immediately of any unauthorized use
                  of your account.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">4. User Content</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  You retain ownership of all content you upload to FluxStudio. By uploading content, you grant us
                  a license to store, display, and transmit that content as necessary to provide the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">5. Acceptable Use</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  You agree not to use the Service for any unlawful purpose or in any way that could damage,
                  disable, or impair the Service. You may not attempt to gain unauthorized access to any part
                  of the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">6. Intellectual Property</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  The Service and its original content, features, and functionality are owned by FluxStudio
                  and are protected by international copyright, trademark, and other intellectual property laws.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">7. Termination</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  We may terminate or suspend your account at any time, without prior notice, for conduct that
                  we believe violates these Terms or is harmful to other users, us, or third parties.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">8. Limitation of Liability</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  FluxStudio shall not be liable for any indirect, incidental, special, consequential, or
                  punitive damages resulting from your use of or inability to use the Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">9. Changes to Terms</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  We reserve the right to modify these Terms at any time. We will notify users of any material
                  changes by posting the new Terms on this page.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">10. Contact Us</h2>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  If you have any questions about these Terms, please contact us at{' '}
                  <a href="mailto:legal@fluxstudio.art" className="text-purple-400 hover:text-purple-300">
                    legal@fluxstudio.art
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to="/privacy" className="text-purple-400 hover:text-purple-300 text-sm">
            Privacy Policy
          </Link>
          <span className="text-neutral-400 dark:text-neutral-600 mx-3">|</span>
          <Link to="/login" className="text-purple-400 hover:text-purple-300 text-sm">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Terms;
