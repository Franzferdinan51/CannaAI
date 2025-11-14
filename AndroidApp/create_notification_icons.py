import os
import struct
import zlib
from pathlib import Path

def create_notification_icon(size, icon_type):
    """Create simple notification icons for different types"""

    # Define colors for different notification types
    colors = {
        'sensor_alert': (255, 87, 34),    # Orange
        'plant_health': (76, 175, 80),    # Green
        'analysis': (33, 150, 243),       # Blue
        'reminder': (255, 193, 7),        # Amber
        'settings': (96, 125, 139),       # Blue Grey
        'camera': (156, 39, 176),         # Purple
        'share': (0, 150, 136),           # Teal
        'check': (76, 175, 80),           # Green
        'system': (158, 158, 158)         # Grey
    }

    color = colors.get(icon_type, (158, 158, 158))

    # Create simple PNG with notification icon
    width = height = size

    # Create image data - simple icon design
    image_data = bytearray()

    for y in range(height):
        row_data = bytearray()
        for x in range(width):
            # Create a simple bell/alert icon shape
            center_x = width // 2
            center_y = height // 2

            # Simple shape detection (bell or circle depending on type)
            if icon_type in ['sensor_alert', 'reminder']:
                # Bell shape
                bell_top_y = center_y - height // 4
                bell_bottom_y = center_y + height // 6

                if y >= bell_top_y and y <= bell_bottom_y:
                    # Bell body - wider at top, narrower at middle
                    width_factor = 1 - abs(y - bell_top_y) / (bell_bottom_y - bell_top_y) * 0.5
                    max_width = width // 2
                    if abs(x - center_x) <= max_width * width_factor:
                        r, g, b = color
                        row_data.extend([r, g, b, 255])
                    else:
                        row_data.extend([0, 0, 0, 0])
                else:
                    row_data.extend([0, 0, 0, 0])
            else:
                # Simple circle icon for other types
                distance = ((x - center_x) ** 2 + (y - center_y) ** 2) ** 0.5
                max_distance = min(width, height) // 3

                if distance <= max_distance:
                    r, g, b = color
                    row_data.extend([r, g, b, 255])
                else:
                    row_data.extend([0, 0, 0, 0])

        # Apply filter (None filter = 0)
        image_data.append(0)  # Filter type
        image_data.extend(row_data)

    # Compress the image data
    compressed_data = zlib.compress(image_data)

    # PNG header
    png_signature = b'\x89PNG\r\n\x1a\n'

    # IHDR chunk
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr_chunk = struct.pack('>I', len(ihdr_data)) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)

    # IDAT chunk
    idat_crc = zlib.crc32(b'IDAT' + compressed_data) & 0xffffffff
    idat_chunk = struct.pack('>I', len(compressed_data)) + b'IDAT' + compressed_data + struct.pack('>I', idat_crc)

    # IEND chunk
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend_chunk = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)

    # Combine all chunks
    png_data = png_signature + ihdr_chunk + idat_chunk + iend_chunk

    return png_data

def create_notification_icons():
    """Create notification icons for all required types"""
    base_path = Path("C:/Users/Ryan/Desktop/CannaAI/AndroidApp/android/app/src/main/res")

    # Notification icons should be in drawable (no density needed for basic icons)
    drawable_path = base_path / "drawable"
    drawable_path.mkdir(parents=True, exist_ok=True)

    # Standard notification icon sizes
    notification_size = 24

    icon_types = [
        'ic_sensor_alert',
        'ic_plant_health',
        'ic_analysis',
        'ic_reminder',
        'ic_settings',
        'ic_camera',
        'ic_share',
        'ic_check',
        'ic_system'
    ]

    for icon_name in icon_types:
        icon_type = icon_name.replace('ic_', '')
        icon_data = create_notification_icon(notification_size, icon_type)
        icon_path = drawable_path / f"{icon_name}.png"

        with open(icon_path, 'wb') as f:
            f.write(icon_data)

        print(f"Created notification icon: {icon_path}")

if __name__ == "__main__":
    create_notification_icons()
    print("All notification icons created successfully!")