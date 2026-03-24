import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import vizionLogo from '@/assets/vizionx-logo.png';
import InlineContactForm from '@/components/InlineContactForm';

export default function Accessibility() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#050508] text-white/80">
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-[#050508]/80 border-b border-white/5">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
          <img src={vizionLogo} alt="VizionX" className="h-8 w-8" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-teal-400 bg-clip-text text-transparent">VIZIONX</span>
        </div>
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Accessibility Statement</h1>
        <p className="text-sm text-white/30 mb-10">Last updated: March 24, 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/70 leading-relaxed [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-white/90 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_strong]:text-white/90">

          <h2>Our Commitment to Accessibility</h2>
          <p>
            At VizionX, we believe that professional-grade market analysis tools should be available to everyone, 
            regardless of their abilities, experiences, or access needs. We are dedicated to building an inclusive platform 
            and continuously improving accessibility across all aspects of our product.
          </p>
          <p>
            We recognize that VizionX is a feature-rich, complex analytical platform, and achieving comprehensive accessibility 
            is an ongoing effort. Our design and development processes are guided by industry best practices and established standards, 
            including Section 508 of the U.S. Rehabilitation Act and the Web Content Accessibility Guidelines (WCAG) 2.2. 
            We strive to meet a minimum standard of <strong>WCAG 2.2 Level AA</strong> success criteria.
          </p>

          <h2>Our Approach</h2>

          <h3>Standards Compliance</h3>
          <p>
            We adhere to internationally recognized web accessibility standards, including WCAG 2.2. 
            Our goal is to ensure that VizionX is perceivable, operable, understandable, and robust for all users.
          </p>

          <h3>Continuous Testing & Evaluation</h3>
          <p>
            We regularly assess our platform for accessibility using a combination of automated testing tools 
            and manual evaluation. This ongoing process helps us identify and resolve accessibility barriers promptly.
          </p>

          <h3>User Feedback</h3>
          <p>
            We actively welcome feedback from all users, including those with disabilities, regarding any accessibility 
            challenges they encounter. Your input is invaluable in guiding our improvement efforts.
          </p>

          <h3>Built-In Accessibility Features</h3>
          <p>
            We have implemented and continue to develop accessibility features across VizionX, including:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-white/60">
            <li>Keyboard navigation support throughout the interface</li>
            <li>Alternative text for images and visual elements</li>
            <li>Compatibility with popular screen readers</li>
            <li>Semantic HTML structure for improved content comprehension</li>
          </ul>

          <h3>Team Training</h3>
          <p>
            Our development and design teams receive ongoing training on accessibility best practices 
            to ensure that new features and content are built with inclusivity in mind from the start.
          </p>

          <h2>Website Accessibility</h2>
          <p>
            The VizionX website at{' '}
            <a href="https://www.vizionx.pro" className="text-cyan-400 hover:underline">www.vizionx.pro</a>{' '}
            is designed to meet WCAG 2.2 Level AA standards. We continuously refine the user experience with the following features:
          </p>

          <h3>Keyboard Navigation</h3>
          <p>
            All interactive elements on our website are accessible via keyboard. Users can navigate using Tab and Shift+Tab keys. 
            We provide skip-navigation links to bypass repetitive elements and jump directly to main content areas.
          </p>

          <h3>Screen Reader Compatibility</h3>
          <p>
            Our website is designed to work with popular screen readers, with clear heading hierarchy, 
            ARIA labels, and structured content to enable audio-based navigation and comprehension.
          </p>

          <h3>Multimedia Controls</h3>
          <p>
            All animated content, including GIFs and videos, includes pause controls, 
            giving users full control over motion and animations.
          </p>

          <h2>Chart Accessibility</h2>
          <p>
            Our charting engine is the core of VizionX, and we are actively working to make it as accessible as possible:
          </p>

          <h3>Keyboard Navigation</h3>
          <p>
            We have implemented keyboard navigation across the chart interface, including the top toolbar, 
            drawing tools panel, side panels, and bottom controls. Users can perform essential charting actions 
            using keyboard shortcuts without requiring a mouse.
          </p>

          <h3>Color Contrast</h3>
          <p>
            We ensure sufficient color contrast across both light and dark themes to enhance readability. 
            Chart elements, labels, and UI controls are designed to be clearly distinguishable 
            for users with varying levels of visual acuity.
          </p>

          <h3>Focus Visibility</h3>
          <p>
            Clear focus indicators are provided throughout the interface so keyboard users can always identify 
            their current position and interact with elements effectively.
          </p>

          <h3>Screen Reader Support</h3>
          <p>
            We are working to ensure that chart data, controls, and interactive elements provide meaningful 
            information to screen readers, enabling users with visual impairments to access market data 
            and analysis tools.
          </p>

          <h2>Ongoing Improvements</h2>
          <p>
            Accessibility is not a destination but an ongoing commitment. As VizionX evolves and new features are added, 
            we continuously evaluate and enhance accessibility. During our current Beta phase, we are especially focused 
            on identifying and addressing accessibility gaps across the platform.
          </p>

          <h2>Contact Us</h2>
          <p>
            Your feedback helps us build a better, more inclusive platform. If you encounter any accessibility issues
            or have suggestions for improvement, please reach out using the form below:
          </p>
          <InlineContactForm
            category="accessibility"
            title="Accessibility Feedback"
            placeholder="Describe the accessibility issue or suggestion..."
            buttonLabel="Submit Feedback"
          />
          <p className="text-white/40 text-xs">
            This form is dedicated to accessibility-related feedback only.
          </p>
          <p>
            Thank you for being part of the VizionX community and for supporting our mission to create
            an accessible and inclusive analytical platform for all.
          </p>

          <div className="border-t border-white/10 pt-8 mt-12">
            <p className="text-xs text-white/30 text-center">
              © {new Date().getFullYear()} VizionX. All rights reserved. | www.vizionx.pro
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
