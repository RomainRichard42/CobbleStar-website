import type {FastifyInstance, FastifyRequest} from 'fastify';
import {z} from 'zod';

const query=z.object({uuid:z.string().regex(/^(?:[a-fA-F0-9]{32}|[a-fA-F0-9]{8}-(?:[a-fA-F0-9]{4}-){3}[a-fA-F0-9]{12})$/).transform(s=>s.replaceAll('-','').toLowerCase())});

/** Read-only lifetime count: independent of leases and of reward keys per vote. */
export function registerVoteProgress(app:FastifyInstance, deps:{authorized:(request:FastifyRequest)=>boolean;count:(uuid:string)=>Promise<number>}) {
 app.get('/api/internal/votes/progress',{config:{rateLimit:{max:300,timeWindow:'1 minute'}}},async(request,reply)=>{
  if(!deps.authorized(request))return reply.code(401).send({error:'INVALID_SERVER_KEY'});
  const parsed=query.safeParse(request.query);
  if(!parsed.success)return reply.code(400).send({error:'INVALID_INPUT'});
  const total=await deps.count(parsed.data.uuid);
  if(!Number.isSafeInteger(total)||total<0)throw new Error('INVALID_VOTE_COUNT');
  return {total};
 });
}
