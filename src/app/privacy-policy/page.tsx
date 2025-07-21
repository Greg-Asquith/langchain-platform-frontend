import { getSession } from '@/lib/session';
import { AppHeader } from "@/components/AppHeader/app-header";
import { AppSidebar } from "@/components/AppSidebar/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function PrivacyPolicy() {
  const { user, organizations, currentOrganizationId } = await getSession();

  const breadcrumbs = [
    { title: "Privacy Policy" }
  ];

  const content = (
    <>
      <AppHeader breadcrumbs={breadcrumbs} useSidebar={user?.id ? true : false} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
            
            <p className="text-sm text-gray-600 mb-8">
              <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-GB')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
              <p className="mb-4">
                Gregory Asquith Limited ("we", "us", or "our") operates the Praxis AI platform ("Service"). 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our Service.
              </p>
              <p className="mb-4">
                We are committed to protecting your privacy and complying with the UK General Data Protection Regulation (UK GDPR), the Data Protection Act 2018, and other applicable privacy laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Data Controller Information</h2>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p><strong>Data Controller:</strong> Gregory Asquith Limited</p>
                <p><strong>Registration:</strong> United Kingdom company</p>
                <p><strong>Email:</strong> hello@gregasquith.com</p>
                <p><strong>Registered Company Number:</strong> 12790388</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold mb-3">3.1 Personal Information</h3>
              <p className="mb-4">We may collect the following types of personal information:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Account Information:</strong> Name, email address, company name</li>
                <li><strong>Profile Information:</strong> Profile picture</li>
                <li><strong>Communication Data:</strong> Messages, support tickets, feedback</li>
                <li><strong>Usage Data:</strong> How you interact with our Service</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">3.2 Technical Information</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
                <li><strong>Log Data:</strong> Access times, pages viewed, actions taken</li>
                <li><strong>Cookies:</strong> Session data, preferences, analytics information</li>
                <li><strong>Performance Data:</strong> API usage, processing times, error logs</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">3.3 Business Data</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Uploaded Content:</strong> Data, files, and content you upload to our Service</li>
                <li><strong>Generated Results:</strong> AI-generated outputs, analyses, and insights</li>
                <li><strong>API Data:</strong> Data transmitted through our API services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. How We Use Your Information</h2>
              <p className="mb-4">We use your personal information for the following purposes:</p>
              
              <h3 className="text-xl font-semibold mb-3">4.1 Service Provision</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Providing and maintaining the Praxis AI platform</li>
                <li>Processing your data through our AI models</li>
                <li>Authenticating your access to the Service</li>
                <li>Enabling collaboration features</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">4.2 Business Operations</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Processing payments and managing subscriptions</li>
                <li>Providing customer support and technical assistance</li>
                <li>Communicating about service updates and changes</li>
                <li>Preventing fraud and ensuring security</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">4.3 Improvement and Analytics</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Analysing usage patterns to improve our Service</li>
                <li>Developing new features and capabilities</li>
                <li>Conducting research and development</li>
                <li>Monitoring performance and reliability</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Legal Bases for Processing</h2>
              <p className="mb-4">Under UK GDPR, we process your personal information based on:</p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Contract:</strong> Processing necessary for performing our contract with you</li>
                <li><strong>Legitimate Interests:</strong> For business operations, security, and service improvement</li>
                <li><strong>Consent:</strong> Where you have given explicit consent for specific purposes</li>
                <li><strong>Legal Obligation:</strong> For compliance with legal requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Data Sharing and Disclosure</h2>
              <p className="mb-4">We may share your personal information in the following circumstances:</p>
              
              <h3 className="text-xl font-semibold mb-3">6.1 Service Providers</h3>
              <p className="mb-4">
                We may share data with trusted third-party service providers who assist us in operating our Service:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Cloud hosting and infrastructure providers</li>
                <li>Payment processors and billing services</li>
                <li>Analytics and monitoring services</li>
                <li>Customer support platforms</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">6.2 Legal Requirements</h3>
              <p className="mb-4">We may disclose your information if required by law or to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Comply with legal process or court orders</li>
                <li>Protect our rights, property, or safety</li>
                <li>Prevent fraud or illegal activities</li>
                <li>Cooperate with law enforcement</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">6.3 Business Transfers</h3>
              <p className="mb-4">
                In the event of a merger, acquisition, or asset sale, your information may be transferred to the new entity, subject to the same privacy protections.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. Data Security</h2>
              <p className="mb-4">
                We implement appropriate technical and organisational measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Access controls and authentication systems</li>
                <li>Regular security audits and penetration testing</li>
                <li>Employee training on data protection</li>
                <li>Incident response and breach notification procedures</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. Data Retention</h2>
              <p className="mb-4">
                We retain your personal information only for as long as necessary for the purposes outlined in this Privacy Policy or as required by law:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Account Data:</strong> Retained while your account is active</li>
                <li><strong>Business Data:</strong> Retained according to your subscription plan</li>
                <li><strong>Log Data:</strong> Typically retained for 12 months</li>
                <li><strong>Billing Data:</strong> Retained for tax and accounting purposes (7 years)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Your Rights</h2>
              <p className="mb-4">Under UK GDPR, you have the following rights:</p>
              
              <h3 className="text-xl font-semibold mb-3">9.1 Access and Portability</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Right to access your personal information</li>
                <li>Right to receive a copy of your data in a portable format</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">9.2 Correction and Deletion</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Right to correct inaccurate personal information</li>
                <li>Right to request deletion of your personal information</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">9.3 Processing Rights</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Right to restrict processing of your data</li>
                <li>Right to object to processing based on legitimate interests</li>
                <li>Right to withdraw consent where processing is based on consent</li>
              </ul>

              <p className="mb-4">
                To exercise these rights, please contact us at hello@gregasquith.com. We will respond to your request within 30 days as required by UK GDPR.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Cookies and Tracking</h2>
              <p className="mb-4">
                We use cookies and similar tracking technologies to provide and improve our Service:
              </p>
              
              <h3 className="text-xl font-semibold mb-3">10.1 Essential Cookies</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Session management and authentication</li>
                <li>Security and fraud prevention</li>
                <li>Load balancing and performance</li>
              </ul>

              <h3 className="text-xl font-semibold mb-3">10.2 Analytics Cookies</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>Usage analytics and performance monitoring</li>
                <li>Feature usage and user behavior analysis</li>
                <li>Error tracking and debugging</li>
              </ul>

              <p className="mb-4">
                You can control cookie preferences through your browser settings, though disabling certain 
                cookies may affect the functionality of our Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. International Data Transfers</h2>
              <p className="mb-4">
                Your personal information may be transferred to and processed in countries outside the UK. We ensure appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Standard Contractual Clauses (SCCs) approved by the UK ICO</li>
                <li>Adequacy decisions for certain countries</li>
                <li>Binding corporate rules for intra-group transfers</li>
                <li>Your explicit consent where required</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Children's Privacy</h2>
              <p className="mb-4">
                Our Service is not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. If you believe we have collected information from a child under 16, please contact us immediately.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">13. Changes to This Privacy Policy</h2>
              <p className="mb-4">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on our website and updating the "Effective Date" above. We encourage you to review this Privacy Policy periodically.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
              <p className="mb-4">
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg mb-4">
                <p><strong>Data Protection Officer</strong></p>
                <p>Gregory Asquith Limited</p>
                <p>Email: hello@gregasquith.com</p>
                <p>Registered Company Number: 12790388</p>
              </div>
              <p className="mb-4">
                You also have the right to lodge a complaint with the Information Commissioner's Office (ICO) 
                if you believe your data protection rights have been violated:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p><strong>Information Commissioner's Office</strong></p>
                <p>Website: ico.org.uk</p>
                <p>Phone: 0303 123 1113</p>
                <p>Address: Wycliffe House, Water Lane, Wilmslow, Cheshire SK9 5AF</p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );

  if (user && organizations) {
    return (
      <SidebarProvider>
        <AppSidebar 
          user={user} 
          organizations={organizations}
          currentOrganizationId={currentOrganizationId}
        />
        <SidebarInset>
          {content}
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return content;
}
