package fr.cobblestar.link;

import net.minecraft.text.ClickEvent;
import net.minecraft.text.HoverEvent;
import net.minecraft.text.Style;
import net.minecraft.text.Text;
import java.text.NumberFormat;
import java.util.Locale;
import java.util.List;

final class PurchaseAnnouncementMessage {
    private static final int GOLD = 0xF5C469, PURPLE = 0xB496EF, WHITE = 0xF8F2FF;

    record Segment(String text, int color, boolean bold, boolean link) { }

    static List<Segment> segments(String name, int stars) {
        String player = name != null && name.matches("[A-Za-z0-9_]{1,16}") ? name : "Un dresseur";
        String amount = NumberFormat.getIntegerInstance(Locale.FRANCE).format(stars).replace('\u202f', ' ');
        return List.of(new Segment("✦ COBBLESTAR\n", GOLD, true, false),
            new Segment(player, PURPLE, true, false), new Segment(" vient de recharger ", WHITE, false, false),
            new Segment(amount + " Stars", GOLD, true, false), new Segment(" !\n", WHITE, false, false),
            new Segment("Merci de soutenir le serveur ! ♥", PURPLE, false, true));
    }

    static Text build(String name, int stars) {
        var message = Text.empty();
        for (var segment : segments(name, stars)) {
            var style = Style.EMPTY.withColor(segment.color()).withBold(segment.bold());
            if (segment.link()) style = style
                .withClickEvent(new ClickEvent(ClickEvent.Action.OPEN_URL, "https://cobblestar-mc.fr/boutique/#stars"))
                .withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, Text.literal("Ouvrir la boutique CobbleStar")));
            message.append(Text.literal(segment.text()).setStyle(style));
        }
        return message;
    }
}
