import { setPairsDBtoRedis } from '../services/user/pair'

(async () => {
    await setPairsDBtoRedis()
})()