import { Link } from 'react-router-dom';

export function Privacy() {
  return (
    <div className="min-h-screen bg-[#1a1a1a] px-4 py-12">
      {/* Header */}
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <span className="text-xl font-bold text-white">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">Flux</span>Studio
          </span>
        </Link>

        {/* Content */}
        <div className="bg-[#242424] rounded-2xl shadow-2xl overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500" />

          <div className="p-8 md:p-12">
            <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-gray-400 mb-8">Last updated: February 2026</p>

            <div className="prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
                <p className="text-gray-300 leading-relaxed">
                  We collect information you provide directly, including your name, email address, and any content
                  you upload to FluxStudio. We also collect usage data such as how you interact with our Service.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
                <p className="text-gray-300 leading-relaxed mb-3">
                  We use your information to:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Provide, maintain, and improve our Service</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices, updates, and support messages</li>
                  <li>Respond to your comments, questions, and requests</li>
                  <li>Monitor and analyze trends, usage, and activities</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">3. Information Sharing</h2>
                <p className="text-gray-300 leading-relaxed">
                  We do not sell your personal information. We may share your information with service providers
                  who assist in operating our Service, or when required by law. Within your organization or team,
                  content you share will be visible to other members as intended by the collaboration features.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">4. Data Security</h2>
                <p className="text-gray-300 leading-relaxed">
                  We implement industry-standard security measures to protect your data, including encryption
                  in transit and at rest. However, no method of transmission over the Internet is 100% secure,
                  and we cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">5. Data Retention</h2>
                <p className="text-gray-300 leading-relaxed">
                  We retain your information for as long as your account is active or as needed to provide
                  you services. You may request deletion of your account and associated data at any time.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">6. Cookies and Tracking</h2>
                <p className="text-gray-300 leading-relaxed">
                  We use cookies and similar technologies to maintain your session, remember your preferences,
                  and analyze how our Service is used. You can control cookies through your browser settings.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">7. Third-Party Services</h2>
                <p className="text-gray-300 leading-relaxed">
                  FluxStudio integrates with third-party services like Google, Figma, Slack, and GitHub for
                  authentication and collaboration. These services have their own privacy policies, and we
                  encourage you to review them.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights</h2>
                <p className="text-gray-300 leading-relaxed mb-3">
                  Depending on your location, you may have rights to:
                </p>
                <ul className="list-disc list-inside text-gray-300 space-y-2 ml-4">
                  <li>Access your personal data</li>
                  <li>Correct inaccurate data</li>
                  <li>Request deletion of your data</li>
                  <li>Export your data in a portable format</li>
                  <li>Opt out of certain data processing</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">9. Children's Privacy</h2>
                <p className="text-gray-300 leading-relaxed">
                  FluxStudio is not intended for children under 13. We do not knowingly collect personal
                  information from children under 13. If you believe we have collected such information,
                  please contact us immediately.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
                <p className="text-gray-300 leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any changes by
                  posting the new policy on this page and updating the "Last updated" date.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
                <p className="text-gray-300 leading-relaxed">
                  If you have questions about this Privacy Policy or our data practices, please contact us at{' '}
                  <a href="mailto:privacy@fluxstudio.art" className="text-purple-400 hover:text-purple-300">
                    privacy@fluxstudio.art
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link to="/terms" className="text-purple-400 hover:text-purple-300 text-sm">
            Terms of Service
          </Link>
          <span className="text-gray-600 mx-3">|</span>
          <Link to="/login" className="text-purple-400 hover:text-purple-300 text-sm">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Privacy;
