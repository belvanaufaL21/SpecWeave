import Logo from '../common/Logo';

const Footer = () => {
  return (
    <footer className="border-t border-white/10 bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <Logo size="md" showText={true} textClassName="text-lg font-semibold text-gray-300" />

          {/* Copyright */}
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} SpecWeave. Transform User Stories into Gherkin with AI.
          </p>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
              Documentation
            </a>
            <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
