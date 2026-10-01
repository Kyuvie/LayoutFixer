/*
 * Vencord userplugin: LayoutFixer
 * Copyright (c) 2026 Kyuvie
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import definePlugin, { IconComponent } from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Parser, useEffect, useState } from "@webpack/common";

type LayoutValue = {
    source: string;
    converted: string;
};

const setters = new Map<string, (value: LayoutValue | undefined) => void>();
const englishLayout = "`qwertyuiop[]asdfghjkl;'zxcvbnm,./";
const russianLayout = "ёйцукенгшщзхъфывапролджэячсмитьбю.";
const layoutMap = new Map<string, string>();

for (let index = 0; index < englishLayout.length; index++) {
    const englishCharacter = englishLayout[index];
    const russianCharacter = russianLayout[index];
    layoutMap.set(englishCharacter, russianCharacter);
    if (englishCharacter !== englishCharacter.toUpperCase()) {
        layoutMap.set(englishCharacter.toUpperCase(), russianCharacter.toUpperCase());
    }
}

for (const [englishCharacter, russianCharacter] of Object.entries({
    "~": "Ё",
    "{": "Х",
    "}": "Ъ",
    ":": "Ж",
    "\"": "Э",
    "<": "Б",
    ">": "Ю",
    "?": ",",
    "@": "\"",
    "#": "№",
    "$": ";",
    "^": ":",
    "&": "?"
})) {
    layoutMap.set(englishCharacter, russianCharacter);
}

function convertText(text: string) {
    return Array.from(text, character => layoutMap.get(character) ?? character).join("");
}

function convertLayout(text: string) {
    if (!/[a-z]/i.test(text)) return null;

    const protectedPattern = /```[\s\S]*?(?:```|$)|(`+)[\s\S]*?\1|\[[^\]\n]*\]\([^)\s]+(?:\s+"[^"]*")?\)|(?:https?:\/\/|www\.)[^\s<>()]+|(?:[a-z0-9-]+\.)+(?:com|net|org|ru|io|gg|dev|app|me|tv|xyz|co|info)\b|@(?:everyone|here)\b|<[^>\s]+>/gi;
    let converted = "";
    let lastIndex = 0;

    for (const match of text.matchAll(protectedPattern)) {
        const index = match.index!;
        converted += convertText(text.slice(lastIndex, index));
        converted += match[0];
        lastIndex = index + match[0].length;
    }

    converted += convertText(text.slice(lastIndex));
    return converted === text ? null : converted;
}

const LayoutFixerIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg viewBox="0 0 24 24" width={width} height={height} className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 9h1m3 0h1m3 0h1m3 0h.01M7 12h1m3 0h1m3 0h1m3 0h.01M8 15h8" />
    </svg>
);

function LayoutAccessory({ message }: { message: Message; }) {
    const [layout, setLayout] = useState<LayoutValue>();

    useEffect(() => {
        setters.set(message.id, setLayout);
        return () => {
            if (setters.get(message.id) === setLayout) setters.delete(message.id);
        };
    }, [message.id]);

    if (!layout || layout.source !== message.content) return null;

    return (
        <div style={{ color: "var(--text-muted)", fontSize: "0.85em", marginTop: "0.5em", whiteSpace: "break-spaces" }}>
            {Parser.parse(layout.converted)}{" ("}
            <button
                onClick={() => setLayout(undefined)}
                style={{ all: "unset", color: "var(--text-link)", cursor: "pointer" }}
            >
                Dismiss
            </button>
            { ")" }
        </div>
    );
}

export default definePlugin({
    name: "LayoutFixer",
    description: "Show message text converted from the English keyboard layout to Russian.",
    tags: ["Chat", "Utility"],
    authors: [{ name: "Kyuvie", id: 1055054298033164289n }],

    renderMessageAccessory: (props: Record<string, any>) => <LayoutAccessory message={props.message} />,

    messagePopoverButton: {
        icon: LayoutFixerIcon,
        render(message: Message) {
            const source = message.content;
            const converted = convertLayout(source);

            return {
                label: "Layout Fixer",
                icon: LayoutFixerIcon,
                message,
                channel: ChannelStore.getChannel(message.channel_id),
                onClick: () => {
                    if (converted) setters.get(message.id)?.({ source, converted });
                }
            };
        }
    }
});
