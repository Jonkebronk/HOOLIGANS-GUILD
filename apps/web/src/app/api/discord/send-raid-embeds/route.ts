import { NextRequest, NextResponse } from 'next/server';

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

type RaidEmbed = {
  name: string;
  color: number;
  groups: {
    name: string;
    players: string[]; // Discord mentions or names
  }[];
  imageData: string; // base64 image
};

export async function POST(request: NextRequest) {
  if (!DISCORD_BOT_TOKEN) {
    return NextResponse.json(
      { error: 'Discord bot not configured' },
      { status: 500 }
    );
  }

  try {
    const { channelId, title, raids } = await request.json() as {
      channelId: string;
      title: string;
      raids: RaidEmbed[];
    };

    if (!channelId || !raids || raids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const messageIds: string[] = [];

    // Send title message first
    if (title) {
      const titleRes = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: `# ${title}`,
          }),
        }
      );
      if (titleRes.ok) {
        const result = await titleRes.json();
        messageIds.push(result.id);
      }
    }

    // Send each raid as a separate embed with image
    for (const raid of raids) {
      // Build fields for groups - list format with bullet points
      const fields = raid.groups.map((group, index) => ({
        name: `Group ${index + 1}`,
        value: group.players.length > 0
          ? group.players.map(p => `• ${p}`).join('\n')
          : '*Empty*',
        inline: true,
      }));

      // Add empty fields to align groups nicely (3 per row)
      while (fields.length % 3 !== 0 && fields.length < 6) {
        fields.push({ name: '\u200B', value: '\u200B', inline: true });
      }

      // Convert base64 to buffer
      const base64Data = raid.imageData.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Buffer.from(base64Data, 'base64');

      // Create form data
      const formData = new FormData();

      // Build embed
      const embed = {
        title: raid.name,
        color: raid.color,
        fields,
        image: {
          url: `attachment://${raid.name.replace(/\s+/g, '-').toLowerCase()}.png`,
        },
        footer: {
          text: `${raid.groups.reduce((sum, g) => sum + g.players.length, 0)} players`,
        },
      };

      const payload = {
        embeds: [embed],
      };

      formData.append('payload_json', JSON.stringify(payload));

      // Add image
      const blob = new Blob([imageBuffer], { type: 'image/png' });
      formData.append('files[0]', blob, `${raid.name.replace(/\s+/g, '-').toLowerCase()}.png`);

      // Send to Discord
      const response = await fetch(
        `https://discord.com/api/v10/channels/${channelId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const result = await response.json();
        messageIds.push(result.id);
      } else {
        const error = await response.json();
        console.error('Discord API error:', error);
      }

      // Small delay between messages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return NextResponse.json({ success: true, messageIds });
  } catch (error) {
    console.error('Failed to send raid embeds to Discord:', error);
    return NextResponse.json(
      { error: 'Failed to send raid embeds' },
      { status: 500 }
    );
  }
}
