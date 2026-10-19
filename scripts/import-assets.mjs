import fs from "node:fs"
import path from "node:path"

const source = "C:/Users/shelu/Desktop/dev/ashel-gym"
fs.mkdirSync("public", { recursive: true })
fs.cpSync(path.join(source, "assets"), "public/assets", {
  recursive: true,
  filter: (entry) => !path.basename(entry).startsWith("."),
})
const seed = fs.readFileSync(path.join(source, "utils/populateDb.tsx"), "utf8")
const images = fs.readFileSync(
  path.join(source, "constants/exerciseImages.ts"),
  "utf8",
)
const paths = new Map(
  [...images.matchAll(/(\w+): require\("\.\.\/assets\/(.*?)"\)/g)].map((m) => [
    m[1],
    m[2],
  ]),
)
const entries = [
  ...seed.matchAll(
    /muscle_group_id: (\w+)\.id,\s*name: "([^"]+)",\s*image: "([^"]+)"/g,
  ),
].map((m, index) => ({
  id: index + 1,
  group: m[1],
  name: m[2],
  image: paths.get(m[3]),
}))
if (
  entries.length !== 46 ||
  entries.some(
    (e) => !e.image || !fs.existsSync(path.join(source, "assets", e.image)),
  )
)
  throw new Error("Incomplete catalog")
fs.mkdirSync("src", { recursive: true })
fs.mkdirSync("src/assets", { recursive: true })
fs.copyFileSync(
  path.join(source, "assets/fonts/Audiowide-Regular.ttf"),
  "src/assets/Audiowide-Regular.ttf",
)
fs.writeFileSync("src/catalog.json", JSON.stringify(entries, null, 2) + "\n")
console.log(`Imported ${entries.length} exercises and original assets`)
