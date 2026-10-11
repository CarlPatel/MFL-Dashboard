from PIL import Image, ImageDraw
from pathlib import Path

# Configuration
INPUT_DIR = Path("screenshots")
OUTPUT_DIR = Path("screenshots/formatted")

BORDER_COLOR = (200, 200, 200, 255)

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def format_screenshot(input_path, output_path):
    image = Image.open(input_path).convert("RGBA")

    width, height = image.size

    CORNER_RADIUS = int(width * 0.2)
    BORDER_WIDTH = max(2, int(width * 0.00625))

    # Create rounded mask
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)

    draw.rounded_rectangle(
        (0, 0, width - 1, height - 1),
        radius=CORNER_RADIUS,
        fill=255
    )

    # Apply rounded corners
    image.putalpha(mask)

    # Create border as an outer frame
    canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(canvas)

    # Draw outer rounded rectangle
    border_draw.rounded_rectangle(
        (0, 0, width - 1, height - 1),
        radius=CORNER_RADIUS,
        fill=BORDER_COLOR
    )

    # Create inner mask
    inner_mask = Image.new("L", (width, height), 0)
    inner_draw = ImageDraw.Draw(inner_mask)

    inner_draw.rounded_rectangle(
        (
            BORDER_WIDTH,
            BORDER_WIDTH,
            width - BORDER_WIDTH - 1,
            height - BORDER_WIDTH - 1
        ),
        radius=max(0, CORNER_RADIUS - BORDER_WIDTH),
        fill=255
    )

    # Composite screenshot inside border
    canvas.paste(image, (0, 0), inner_mask)

    canvas.save(output_path, "PNG")

    print(f"Saved: {output_path}")
    
# Process all PNG screenshots
for image_path in INPUT_DIR.glob("*.png"):
    output_path = OUTPUT_DIR / image_path.name
    format_screenshot(image_path, output_path)