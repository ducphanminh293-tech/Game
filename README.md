# Fruit Bloom

A small, illustrated garden village you can explore on a PC. This is an interactive **web prototype**, with English as the default language and a complete Vietnamese option.

## Current revision

Vietnamese UI now uses bundled Noto Sans and Noto Serif fonts, including the
standalone export. Download the latest repository ZIP to get this fix.

This revision adds a playable swap-based match-3 level and a separate
**Village studio** for placing and moving individual objects. The main village
still uses the original illustrated scene; the studio tests the new layout
system with simple vector artwork.

[Read the design direction (Vietnamese)](docs/design-direction-v2.vi.md) and
[compare the two art directions](docs/modular-art-study.png). The comparison is
concept artwork, not a screenshot of the modular prototype.

## Preview the artwork

![Fruit Bloom village](docs/village.png)

![Mira, Jasper and Rowan](docs/characters.png)

## Play match-3

Choose **Play → Play match-3**. Drag between two neighboring tiles, or click them
in sequence, to form a row or column of at least three matching fruit. Collect
**12 apples and 9 grapes within 18 moves** on the 6×6 board. Invalid swaps return
the tiles without spending a move; cleared tiles fall and refill to allow
cascades. Use **Show a match** for a hint. If no legal move remains, the board
reshuffles automatically. Win, lose, and retry are supported.

Keyboard: use the arrow keys to navigate the board, then Space or Enter to
select the two neighboring tiles. This is one demo level; wins do not add
village resources.

![Playable swap match-3 demo](docs/gameplay.png)

## Build and decorate

Choose **Build → Village studio**. Select a rice paddy, apple tree, stone path,
lamp, wildflowers, cypress, cottage, or workbench, then click a clear tile. The
11×11 isometric grid previews placement and prevents overlaps or placement
outside the meadow. Select a placed item to move or remove it; **Undo** reverses
the last change.

Select a rice paddy or apple tree and use **Change growth** to compare growing
and harvest-ready art. This changes a preview state, not a production timer.
The layout is saved in this browser when storage is available and survives
language changes. Keyboard placement uses arrow keys and Enter; Esc cancels.

The farmer and vegetation have small, separate animations that respect reduced
motion. These demonstrate movement; NPC pathfinding, work routines, production,
and rewards are future work. The studio's simple original SVG art tests
readability and placement. The AI art comparison is a separate visual study,
not artwork already implemented in this grid.

![Modular village decorating prototype](docs/village-studio.png)

![Vietnamese typography with bundled fonts](docs/vietnamese-font-fix.png)

## Browser preview on GitHub Pages

The configured site address is **https://ducphanminh293-tech.github.io/Game/**.
It becomes available after Pages is enabled and the deployment workflow succeeds.

For this repository, select **Settings → Pages → Build and deployment → Source:
GitHub Actions**. Then run **Actions → Publish Fruit Bloom to GitHub Pages → Run
workflow** if the initial deployment has not completed. Later pushes to `main`
deploy automatically. No API keys or server are required for the game.

The workflow stages only `index.html`, `src/`, `assets/` and `.nojekyll` using
`python3 scripts/stage_site.py`. Source files, generated PC downloads and test
tools remain separate from the published site.

## Open the PC preview

1. Download the [latest source ZIP](https://github.com/ducphanminh293-tech/Game/archive/refs/heads/main.zip).
2. Extract the entire ZIP, then open `index.html` in Chrome, Edge, Firefox, or Safari. Keep `src/` and `assets/` beside it.
3. If you have an exported `Fruit-Bloom-PC.html`, open that file directly. The export includes its artwork and fonts and works offline.

The generated `dist/` folder is not committed to GitHub. To create the single-file
export from the source ZIP, run the build command below. Previously downloaded
copies do not update automatically; download the source ZIP again after an update.

Click buildings, residents, and the navigation buttons to explore. Drag the garden to pan, use the zoom controls to look closer, and close a window to return to the village. Use the language switch to change between English and Vietnamese; the selected language is remembered when browser storage is available.

The preview includes building information, three sample residents, demo assignments and their illustrated benefits, storage, recruitment presentation, and stage objectives. The match-3 level and modular Village studio are playable. Production, actual recruitment, a level campaign, and permanent reward claims are not implemented. All quantities and assignment bonuses are illustrative, not final balance rules. The preview does not charge tickets or real money.

Landscape phones are also supported; portrait screens show a rotate-device prompt. A desktop browser provides the intended PC review experience.

## Development

Python 3 is the only required development runtime. Node/npm is optional and provides convenient command aliases.

```sh
cd /workspace/Game
python3 scripts/serve.py 4173
```

The development server listens on the machine's loopback interface. This address is for local development and automated validation; the downloadable HTML is the portable user preview.

Build the portable preview after changing the source:

```sh
python3 scripts/build.py
```

Equivalent commands are `npm run dev` and `npm run build`. No package installation is required.

Source layout:

- `index.html`: page shell and script order.
- `src/styles.css`: layout, art presentation, responsive behavior, and reduced motion.
- `src/app.js`: interaction and demo state.
- `src/data.js`: sample resources, buildings, residents, and stage.
- `src/puzzle.js` and `src/puzzle.css`: fruit puzzle rules and interface.
- `src/village.js` and `src/village.css`: modular Village studio and original SVG objects.
- `src/typography.css` and `assets/fonts/`: bundled Vietnamese-capable fonts and SIL Open Font License notices.
- `src/i18n.js`: English and Vietnamese interface copy.
- `src/icons.js`: interface icons.
- `assets/`: village and character artwork.
- `scripts/build.py`: embeds scripts, styles, and artwork in a self-contained HTML file and ZIP.

The builder writes `dist/Fruit-Bloom-PC.html` and `dist/Fruit-Bloom-PC.zip`. Rebuild before sharing; running the source server does not refresh exported artifacts.

## Mở bản xem trước trên PC

Tải [ZIP mã nguồn mới nhất](https://github.com/ducphanminh293-tech/Game/archive/refs/heads/main.zip),
giải nén toàn bộ rồi mở `index.html` bằng Chrome, Edge, Firefox hoặc Safari. Giữ
nguyên thư mục `src/` và `assets/`. Bản đã tải về không tự cập nhật.

Nếu có bản xuất `Fruit-Bloom-PC.html`, chỉ cần mở file đó; font và hình ảnh đã
được nhúng, không cần mạng. Thư mục `dist/` không nằm trên GitHub; lệnh build ở
trên tạo bản HTML và ZIP này.

Kéo khu vườn để di chuyển góc nhìn, dùng nút thu phóng và bấm vào công trình hoặc các nút điều hướng để khám phá. Giao diện mặc định là tiếng Anh; nút **VI / EN** cho phép đổi ngôn ngữ và ghi nhớ lựa chọn khi trình duyệt cho phép lưu dữ liệu.

Vào **Chơi → Chơi ghép 3** để thử bàn 6×6: kéo hoặc bấm hai ô liền nhau, ghép
từ ba trái theo hàng ngang/dọc và thu đủ **12 táo, 9 nho trong 18 lượt**. Đổi
không tạo nhóm không mất lượt. Có trái rơi, chuỗi ghép, gợi ý, thắng/thua và chơi
lại; bảng tự xáo khi hết nước hợp lệ.

Vào **Xây dựng → Xưởng thiết kế làng** để đặt ruộng lúa, cây táo, đường đá, đèn,
hoa, cây bách, nhà nhỏ hoặc bàn làm việc. Chọn vật đã đặt để di chuyển/dỡ bỏ;
có hoàn tác và lưu bố cục trên trình duyệt. Chọn ruộng hoặc cây rồi bấm **Đổi
giai đoạn** để xem trạng thái đang lớn và sẵn sàng thu hoạch. Đây là thao tác
xem trước, chưa có thời gian sản xuất thật.

Xưởng dùng đồ họa vector đơn giản để thử cách bố trí. Nhân vật và cây có chuyển
động minh họa riêng; chưa có AI tìm đường hoặc làm việc tự động. Cảnh làng chính
vẫn giữ hình cũ. Ảnh nghiên cứu mỹ thuật trong tài liệu là hướng tham khảo riêng,
không phải đồ họa đã được đưa vào xưởng.

Bạn vẫn có thể thử phân công cư dân và xem lợi ích minh họa trong làng hiện tại.
Sản xuất theo thời gian, chuỗi màn chơi, quay gacha thật và nhận thưởng thật chưa
được triển khai. Các số liệu đều là dữ liệu demo.

## Validation

The browser smoke suite uses Python Playwright and Chromium from the development
machine. They are testing tools only; the exported game has no runtime dependency
on them.

```sh
python3 tests/smoke.py
python3 tests/smoke.py --standalone dist/Fruit-Bloom-PC.html
node tests/puzzle_model.cjs
python3 tests/puzzle_smoke.py
python3 tests/puzzle_smoke.py --standalone dist/Fruit-Bloom-PC.html
python3 tests/village_smoke.py
python3 tests/village_smoke.py --standalone dist/Fruit-Bloom-PC.html
python3 tests/typography.py
python3 tests/typography.py --standalone dist/Fruit-Bloom-PC.html
```

The standalone check blocks subresource requests and confirms artwork is embedded.
The suite covers English defaults, language changes, demo assignment consistency,
persistence, modal navigation, camera controls, and desktop/mobile layouts.
Match-3 checks cover valid/invalid swaps, cascades, goals, win/loss, playable
boards, real pointer input, keyboard controls, retry, and language changes.
Village studio checks cover placement, collision, moving, removal, undo,
growth previews, persistence, and layout. Typography checks cover Vietnamese
glyphs, Unicode normalization, and actual browser font use in both source and
standalone builds.

## Design decisions still open

- Construction and upgrade costs, production rules, and expansion progression.
- Recruit rarities, odds, ticket cost, pity rules, duplicate handling, and progression.
- Match-3 balancing, special pieces, obstacles, and level progression.
- Modular village production, NPC work routines, and final asset animation.

The prototype does not lock these decisions in. Sample values live in `src/data.js`.
