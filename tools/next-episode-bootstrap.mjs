#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const readJson=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const writeJson=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n');};

export function planNextEpisodeBootstrap({state,publication,topics=[]}){
  const next=topics.find((t)=>t&&t.enabled!==false&&!t.consumedAt);
  if(!next) return {kind:'NOOP',reason:'no_unconsumed_topic'};
  if(!['QA_PASSED','AUTO_PUBLISH_READY','PUBLISHED','ANALYZED'].includes(state?.state)) return {kind:'NOOP',reason:'current_episode_not_finished'};
  if(publication?.episodeId!==state?.episode_id) return {kind:'NOOP',reason:'publication_episode_mismatch'};
  const yt=publication?.youtube||{};
  if(!yt.videoId||!yt.privateVerifiedAt||yt.processingVerified!==true||yt.playbackVerified!==true||yt.metadataVerified!==true||yt.thumbnailSetSucceeded!==true) return {kind:'NOOP',reason:'private_publication_not_verified'};
  return {kind:'ROLLOVER',topic:next};
}

export function blankEpisodeState(){
  const now=new Date().toISOString();
  return {
    pipeline_version:'2.1',episode_id:null,state:'IDLE',state_revision:0,updated_at:now,updated_by:'next-episode-bootstrap',
    lock:{active:false,locked_at:null,locked_by:null,reason:null},
    growth:{opportunity_score:null,why_this_wins:null,core_paradox:null,hook_promise:null,target_length_min:null,critic_lessons_applied:[],packages:{},research_questions:[],fact_risks:[],topic_id:null,topic:null,topic_source:null},
    production:{script_words:0,estimated_duration_min:null,pronunciation_dictionary:[],voice_candidates:['af_heart'],selected_voice:'af_heart',voice_asset:null,render_asset:null,qa_inputs_ready:false},
    qa:{status:null,scores:{},top_issues:[],required_fixes:[],user_action_required:null},
    analytics:{last_checked_at:null,sample_note:null,metrics:{},keep:[],change:[],avoid:[],test_next:[],ab_test_recommendation:null},
    history:[]
  };
}

export function archiveFinishedEpisode({currentDir='episodes/current',archiveRoot='episodes/archive',state}){
  const id=String(state?.episode_id||'').trim();
  if(!id) throw new Error('cannot archive episode without episode_id');
  const dest=path.join(archiveRoot,id);
  if(fs.existsSync(dest)) return dest;
  fs.mkdirSync(dest,{recursive:true});
  const names=['episode-state.json','publication.json','research.md','script.md','production-input.json','qa-review.json','render-manifest.json','image-assets-v1.json'];
  for(const name of names){const src=path.join(currentDir,name);if(fs.existsSync(src)) fs.copyFileSync(src,path.join(dest,name));}
  return dest;
}

function main(){
  const currentDir=process.env.CURRENT_EPISODE_DIR||'episodes/current';
  const statePath=path.join(currentDir,'episode-state.json');
  const publicationPath=path.join(currentDir,'publication.json');
  const topicsPath=process.env.TOPIC_QUEUE_PATH||'queue/topics.json';
  if(!fs.existsSync(statePath)||!fs.existsSync(publicationPath)||!fs.existsSync(topicsPath)){console.log('NOOP missing_rollover_inputs');return;}
  const state=readJson(statePath);const publication=readJson(publicationPath);const q=readJson(topicsPath);const topics=Array.isArray(q)?q:(q.topics||[]);
  const plan=planNextEpisodeBootstrap({state,publication,topics});
  if(plan.kind!=='ROLLOVER'){console.log(`NOOP ${plan.reason}`);return;}
  const archived=archiveFinishedEpisode({currentDir,state});
  for(const name of ['publication.json','research.md','script.md','production-input.json','qa-review.json','render-manifest.json','image-assets-v1.json']){const p=path.join(currentDir,name);if(fs.existsSync(p))fs.rmSync(p);}
  writeJson(statePath,blankEpisodeState());
  console.log(JSON.stringify({kind:'ROLLOVER',archived,previousEpisodeId:state.episode_id,nextTopicId:plan.topic.id}));
}

if(import.meta.url===`file://${process.argv[1]}`) main();
