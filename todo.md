# TODO

- create function from the virtual module that conditionally adds icons to
  physical file
- configure the vite plugin server to use that file to create svgmaps during dev
  mode
- during the vite build (in ci) create aforementioned physical file for every
  import and create the svg map and place in the public directory
