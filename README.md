# dianagrigorovich.com

Static portfolio hosted with GitHub Pages.

## Project structure

```text
.
├── index.html              # Home page
├── resume.html             # Resume page
├── projects.html           # Projects page
├── contact.html            # Contact page
├── signature.html          # Standalone email signature
├── assets/
│   ├── css/
│   │   └── style.css       # Shared site styles
│   ├── js/
│   │   ├── main.js         # Shared interactions and animations
│   │   ├── analytics.js    # Shared analytics integration
│   │   └── resume.js       # Resume data and interactions
│   └── images/
│       ├── branding/       # Site-only branding assets
│       └── games/          # Company and game artwork
├── CNAME                   # Custom domain configuration
└── favicon.png
```

The root-level images referenced by `signature.html` intentionally remain in
place. Existing email signatures use their public URLs, so moving them would
break images in previously sent emails.

## Production assets

Readable CSS and JavaScript sources live in `assets/css` and `assets/js`.
The HTML pages load their generated `.min.css` and `.min.js` counterparts.
Original image sources that are not used by the website are preserved under
`_source-assets`; Jekyll excludes that directory from the published site.

Install the pinned development dependencies once, then rebuild and verify the
public assets before publishing:

```sh
npm install
npm run check
```

Do not edit generated `.min.css` and `.min.js` files directly.
