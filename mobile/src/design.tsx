import React from "react";
import { StyleSheet, Text, View } from "react-native";

export const palette = { background: "#0e1519", panel: "#171e22", raised: "#242c31", cyan: "#00d4ed", mint: "#36e7bb", text: "#dce2e7", muted: "#a9b9be", gold: "#ffc857" };
export function RouteCard({pickup, destination}: {pickup: string; destination: string}) {
  return <View style={ui.route}><View style={ui.routeRow}><View style={ui.dot}/><View style={ui.grow}><Text style={ui.label}>PICKUP</Text><Text style={ui.body}>{pickup}</Text></View></View><View style={ui.rail}/><View style={ui.routeRow}><View style={[ui.dot, {backgroundColor: palette.gold, borderRadius: 2}]}/><View style={ui.grow}><Text style={ui.label}>DESTINATION</Text><Text style={ui.body}>{destination}</Text></View></View></View>;
}
export function PersonCard({name, detail, badge}: {name: string; detail: string; badge?: string}) {
  return <View style={ui.person}><View style={ui.avatar}><Text style={ui.initial}>{name.slice(0,1).toUpperCase()}</Text></View><View style={ui.grow}><Text style={ui.heading}>{name}</Text><Text style={ui.muted}>{detail}</Text></View>{badge && <Text style={ui.badge}>{badge}</Text>}</View>;
}
export function CarIcon({active = false}: {active?: boolean}) {
  const color = active ? palette.cyan : palette.muted;
  return <View style={ui.carWrap}><View style={[ui.carRoof,{borderColor: color}]}/><View style={[ui.carBody,{borderColor: color}]}><View style={[ui.light,{backgroundColor:color}]}/><View style={[ui.light,{backgroundColor:color}]}/></View><View style={ui.wheels}><View style={[ui.wheel,{backgroundColor:color}]}/><View style={[ui.wheel,{backgroundColor:color}]}/></View></View>;
}
export const ui = StyleSheet.create({
  grow:{flex:1}, label:{color:palette.muted,fontSize:10,letterSpacing:.7,marginBottom:4}, body:{color:palette.text,fontSize:14,lineHeight:20}, muted:{color:palette.muted,fontSize:12,lineHeight:18}, heading:{color:palette.text,fontSize:18,fontWeight:"600"},
  route:{padding:16,backgroundColor:"#1c2429",borderRadius:16,marginVertical:12},routeRow:{flexDirection:"row",alignItems:"center",gap:12},dot:{width:10,height:10,borderRadius:5,backgroundColor:palette.cyan},rail:{height:18,borderLeftWidth:1,borderColor:"#526168",marginLeft:4},
  person:{flexDirection:"row",alignItems:"center",gap:12,padding:16,backgroundColor:"#1c2429",borderRadius:16,marginVertical:12},avatar:{width:48,height:48,borderRadius:24,backgroundColor:"#19424a",alignItems:"center",justifyContent:"center"},initial:{color:palette.cyan,fontSize:24,fontWeight:"700"},badge:{color:palette.mint,fontSize:12,fontWeight:"600"},
  carWrap:{width:32,height:28,justifyContent:"center"},carRoof:{width:22,height:10,borderWidth:2,borderTopLeftRadius:5,borderTopRightRadius:5,alignSelf:"center"},carBody:{height:13,borderWidth:2,borderRadius:3,marginTop:-2,flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:3},light:{width:5,height:3,borderRadius:1},wheels:{flexDirection:"row",justifyContent:"space-between",paddingHorizontal:3},wheel:{width:5,height:4,borderBottomLeftRadius:2,borderBottomRightRadius:2},
  success:{alignItems:"center",paddingVertical:24,gap:10},check:{width:58,height:58,borderRadius:29,backgroundColor:palette.mint,color:palette.background,textAlign:"center",lineHeight:58,fontSize:34},successTitle:{color:palette.text,fontSize:28,fontWeight:"700"},receipt:{backgroundColor:"#1c2429",padding:18,borderRadius:16,marginVertical:16,gap:16},receiptRow:{flexDirection:"row",justifyContent:"space-between",gap:12},total:{color:palette.cyan,fontSize:28,fontWeight:"700"},handle:{height:4,width:40,borderRadius:2,backgroundColor:"#465157",alignSelf:"center",marginBottom:20},footnote:{color:palette.muted,fontSize:11,textAlign:"center",marginTop:14,lineHeight:18},
});
