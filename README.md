# Vantixia

Source for [vantixia.in](https://vantixia.in), the website of Vantixia, a founder-led offensive security practice based in Delhi, India.

Vantixia runs adversarial testing for GenAI, agentic pipelines and the infrastructure powering them, alongside web, mobile, cloud and infrastructure penetration testing. Engagements are scoped and tested by the founder, Rajnish Kumar.

## About this repository

- Static HTML, CSS and JavaScript. There is no build step: the repository root is the web root.
- Shared styles live in `css/cyber.css`; shared behaviour lives in `js/cyber.js` and `js/motion.js`.
- The site header and footer are repeated in every page, so a change to either must be made on every page.
- `scripts/update-sitemap-lastmod.mjs` refreshes the `lastmod` dates in `sitemap.xml`.
- `nextjs/` holds a standalone Next.js component that is not used by the static site.

## Contact

- Email: [info@vantixia.in](mailto:info@vantixia.in)
- Book a scoping call: [cal.com/vantixia/scoping-call-vantixia](https://cal.com/vantixia/scoping-call-vantixia)
- LinkedIn: [linkedin.com/company/vantixiasec](https://linkedin.com/company/vantixiasec)
- X: [x.com/vantixiasec](https://x.com/vantixiasec)
- YouTube: [youtube.com/@VANTIXIASEC](https://www.youtube.com/@VANTIXIASEC)

To report a security issue in this site, see [vantixia.in/security-policy/](https://vantixia.in/security-policy/).
