import React from 'react';
import { Github, Twitter, Linkedin, ExternalLink } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="mt-auto py-8 border-t border-border bg-surface/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h4 className="text-xl font-bold tracking-tighter mb-1">SmartTrade</h4>
            <p className="text-sm text-text-secondary">© 2026 SmartTrade Platform. Built for the Future of Finance.</p>
          </div>
          
          <div className="flex items-center space-x-6">
            <a href="#" className="text-text-secondary hover:text-primary transition-colors"><Twitter size={20} /></a>
            <a href="#" className="text-text-secondary hover:text-primary transition-colors"><Github size={20} /></a>
            <a href="#" className="text-text-secondary hover:text-primary transition-colors"><Linkedin size={20} /></a>
          </div>

          <div className="flex items-center space-x-4 text-sm font-bold uppercase tracking-widest text-text-secondary">
            <a href="#" className="hover:text-text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-text-primary transition-colors flex items-center space-x-1">
              <span>Support</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
