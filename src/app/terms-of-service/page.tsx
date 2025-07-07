import { getSession } from '@/lib/session';
import { AppHeader } from "@/components/AppHeader/app-header";
import { AppSidebar } from "@/components/AppSidebar/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";

export default async function TermsOfService() {
  const { user, organizations, currentOrganizationId } = await getSession();

  const breadcrumbs = [
    { title: "Terms of Service" }
  ];

  const content = (
    <>
      <AppHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
            
            <p className="text-sm text-gray-600 mb-8">
              <strong>Effective Date:</strong> {new Date().toLocaleDateString('en-GB')}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">1. Agreement to Terms</h2>
              <p className="mb-4">
                These Terms of Service ("Terms") constitute a legally binding agreement between you ("User", "you", or "your") 
                and Gregory Asquith Limited, a company registered in the United Kingdom (company number to be inserted) 
                ("Company", "we", "us", or "our") regarding your use of the Praxis AI platform and related services 
                (collectively, the "Service").
              </p>
              <p className="mb-4">
                By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part 
                of these Terms, then you may not access the Service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <p className="mb-4">
                Praxis AI is a software-as-a-service (SaaS) platform that provides artificial intelligence and machine 
                learning capabilities to businesses and individuals. The Service includes but is not limited to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>AI-powered analytics and insights</li>
                <li>Machine learning model deployment and management</li>
                <li>Data processing and analysis tools</li>
                <li>API access and integration capabilities</li>
                <li>User dashboard and management interface</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts and Registration</h2>
              <p className="mb-4">
                To access certain features of the Service, you must create an account. You agree to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Provide accurate, complete, and current information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <p className="mb-4">You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 mb-4">
                <li>Violate any applicable laws, regulations, or third-party rights</li>
                <li>Transmit malicious code, viruses, or other harmful content</li>
                <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
                <li>Use the Service for any illegal, harmful, or abusive purposes</li>
                <li>Interfere with or disrupt the Service's functionality</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">5. Intellectual Property Rights</h2>
              <p className="mb-4">
                The Service and its original content, features, and functionality are and will remain the exclusive 
                property of Gregory Asquith Limited and its licensors. The Service is protected by copyright, 
                trademark, and other intellectual property laws.
              </p>
              <p className="mb-4">
                You retain ownership of any data, content, or materials you upload to or create using the Service. 
                By using the Service, you grant us a limited, non-exclusive license to use, process, and store 
                your content solely for the purpose of providing the Service to you.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">6. Payment Terms</h2>
              <p className="mb-4">
                Certain features of the Service may require payment. By subscribing to a paid plan, you agree to:
              </p>
              <ul className="list-disc pl-6 mb-4">
                <li>Pay all fees as specified in your chosen subscription plan</li>
                <li>Provide valid payment information</li>
                <li>Authorize automatic renewal unless cancelled</li>
                <li>Accept that all fees are non-refundable except as required by law</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">7. LIMITATION OF LIABILITY</h2>
              <p className="mb-4 font-semibold">
                TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL GREGORY ASQUITH LIMITED, 
                ITS DIRECTORS, EMPLOYEES, PARTNERS, AGENTS, SUPPLIERS, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION, LOSS OF 
                PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR USE OF THE SERVICE.
              </p>
              <p className="mb-4">
                Our total liability to you for all claims arising from or relating to the Service shall not exceed 
                the amount you paid us in the twelve (12) months preceding the event giving rise to the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">8. DISCLAIMER OF WARRANTIES</h2>
              <p className="mb-4 font-semibold">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
                ERROR-FREE, OR COMPLETELY SECURE.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">9. Indemnification</h2>
              <p className="mb-4">
                You agree to indemnify, defend, and hold harmless Gregory Asquith Limited and its officers, directors, 
                employees, and agents from and against any and all claims, damages, obligations, losses, liabilities, 
                costs, and expenses (including reasonable attorney's fees) arising from your use of the Service or 
                violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">10. Termination</h2>
              <p className="mb-4">
                We may terminate or suspend your account and access to the Service immediately, without prior notice 
                or liability, for any reason, including if you breach these Terms.
              </p>
              <p className="mb-4">
                Upon termination, your right to use the Service will cease immediately. All provisions of these Terms 
                that should survive termination shall survive, including ownership provisions, warranty disclaimers, 
                indemnity, and limitations of liability.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">11. Data Protection</h2>
              <p className="mb-4">
                We are committed to protecting your privacy and personal data in accordance with the UK General Data 
                Protection Regulation (UK GDPR) and the Data Protection Act 2018. Please review our Privacy Policy 
                for detailed information about how we collect, use, and protect your data.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">12. Governing Law and Jurisdiction</h2>
              <p className="mb-4">
                These Terms shall be governed by and construed in accordance with the laws of England and Wales, 
                without regard to its conflict of law provisions. Any disputes arising under these Terms shall be 
                subject to the exclusive jurisdiction of the courts of England and Wales.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">13. Changes to Terms</h2>
              <p className="mb-4">
                We reserve the right to modify these Terms at any time. If we make material changes, we will notify 
                you by email or by posting a notice on our platform. Your continued use of the Service after such 
                modifications constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">14. Contact Information</h2>
              <p className="mb-4">
                If you have any questions about these Terms, please contact us at:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p><strong>Gregory Asquith Limited</strong></p>
                <p>Email: legal@praxisai.com</p>
                <p>Address: [Your registered UK business address]</p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">15. Entire Agreement</h2>
              <p className="mb-4">
                These Terms constitute the entire agreement between you and Gregory Asquith Limited regarding the 
                use of the Service and supersede all prior agreements and understandings, whether written or oral.
              </p>
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
