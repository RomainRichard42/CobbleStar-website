import fr.cobblestar.planets.client.GashaponMotion;
import fr.cobblestar.planets.client.GashaponPhysics;
import fr.cobblestar.planets.client.GashaponContents;
import fr.cobblestar.planets.academy.GashaponCycle;
import java.nio.file.*;
import java.util.Locale;

/** Exports the current game's persistent bodies and articulated grab, one capsule per catalogue row. */
public class CrateShowcaseMotion {
 static String point(GashaponMotion.Point p){return String.format(Locale.ROOT,"[%.4f,%.4f,%.4f]",p.x(),p.y(),p.z());}
 public static void main(String[] args)throws Exception{
  int count=Integer.parseInt(args[1]);GashaponContents probe=new GashaponContents(count);
  for(int t=0;t<=60;t++)probe.update(t/GashaponCycle.RATE,t,0);
  int selected=0;double best=-Double.MAX_VALUE;
  for(int i=0;i<count;i++){var p=probe.at(i);double score=p.y()*10-p.z();if(score>best){best=score;selected=i;}}
  GashaponContents bodies=new GashaponContents(count);
  StringBuilder s=new StringBuilder("{\"selected\":"+selected+",\"scale\":"+bodies.scale+",\"end\":"+GashaponCycle.END+",\"rate\":"+(20*GashaponCycle.RATE)+",\"angles\":[");
  for(int i=0;i<3;i++){if(i>0)s.append(',');s.append(GashaponPhysics.BLOCKY_CONTACT_ANGLES[i]);}s.append("],\"frames\":[");
  for(int t=-2;t<=GashaponCycle.END;t++){
   if(t>=0)bodies.update(t/GashaponCycle.RATE,t,selected);
   if(t%2!=0)continue;if(t>-2)s.append(',');var target=bodies.target(selected);
   s.append("{\"t\":").append(t).append(",\"claw\":").append(point(GashaponMotion.claw(t,0,target,bodies.scale))).append(",\"carriage\":").append(point(GashaponMotion.carriage(t,0,target,bodies.scale))).append(",\"grip\":").append(GashaponMotion.grip(t)).append(",\"lid\":").append(GashaponMotion.lid(t)).append(",\"roll\":").append(GashaponMotion.roll(t,bodies.radius)).append(",\"squash\":").append(GashaponMotion.squash(t)).append(",\"balls\":[");
   for(int i=0;i<count;i++){if(i>0)s.append(',');s.append(point(i==selected&&t>=60?GashaponMotion.ball(t,target,bodies.radius):bodies.at(i)));}s.append("]}");
  }
  s.append("]}");Files.writeString(Path.of(args[0]),s.toString());System.out.println(args[0]+": "+count+" bodies, example index "+selected);
 }
}
