import { app } from './app.js';
import { env } from './config/env.js';
import { scheduleMembershipExpiry } from './jobs/membershipExpiry.job.js';

app.listen(env.PORT, () => {
  console.log(`ClubFlow API listening on http://localhost:${env.PORT}`);
  scheduleMembershipExpiry();
});
