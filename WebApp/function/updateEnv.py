import os

def update_config_env(updates: dict, config_path="config.env"):
    if os.path.exists(config_path):
        with open(config_path, "r") as f:
            lines = f.readlines()
    else:
        lines = []

    new_lines = []
    found_keys = {key: False for key in updates}

    for line in lines:
        updated = False
        for key, value in updates.items():
            if line.startswith(f"{key}="):
                new_lines.append(f"{key}={value}\n")
                found_keys[key] = True
                updated = True
                break
        if not updated:
            new_lines.append(line)

    for key, value in updates.items():
        if not found_keys[key]:
            new_lines.append(f"{key}={value}\n")

    with open(config_path, "w") as f:
        f.writelines(new_lines)