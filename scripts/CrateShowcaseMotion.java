import fr.cobblestar.planets.client.GashaponMotion;
import fr.cobblestar.planets.client.GashaponPhysics;
import fr.cobblestar.planets.academy.GashaponCycle;
import java.nio.file.*;
import java.util.Locale;

/** Exports the game's own motion curves, with no loot or player data. */
public class CrateShowcaseMotion {
 static String point(GashaponMotion.Point p){return String.format(Locale.ROOT,"[%.4f,%.4f,%.4f]",p.x(),p.y(),p.z());}
 public static void main(String[] args)throws Exception{
  int selected=GashaponPhysics.pick(0);
  StringBuilder s=new StringBuilder("{\"selected\":"+selected+",\"scale\":"+GashaponPhysics.MODEL_SCALE+",\"end\":"+GashaponCycle.END+",\"rate\":"+(20*GashaponCycle.RATE)+",\"angles\":[");
  for(int i=0;i<3;i++){if(i>0)s.append(',');s.append(GashaponPhysics.BLOCKY_CONTACT_ANGLES[i]);}s.append("],\"frames\":[");
  for(int t=-2;t<=GashaponCycle.END;t+=2){if(t>-2)s.append(',');var target=GashaponPhysics.at(selected,60);s.append("{\"t\":").append(t).append(",\"claw\":").append(point(GashaponMotion.claw(t,0,selected))).append(",\"carriage\":").append(point(GashaponMotion.carriage(t,0,target,GashaponPhysics.MODEL_SCALE))).append(",\"grip\":").append(GashaponMotion.grip(t)).append(",\"lid\":").append(GashaponMotion.lid(t)).append(",\"roll\":").append(GashaponMotion.roll(t)).append(",\"balls\":[");
   for(int i=0;i<GashaponPhysics.COUNT;i++){if(i>0)s.append(',');s.append(point(GashaponMotion.capsule(i,t,selected)));}s.append("]}");
  }
  s.append("]}");Files.writeString(Path.of(args[0]),s.toString());
 }
}
