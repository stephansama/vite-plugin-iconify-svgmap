import url from "node:url";

const pkg2 = new url.URL("./examples/ui", import.meta.url);
const pkg = new url.URL("./examples/ui/package.json", import.meta.url);

console.log(pkg, pkg2);
