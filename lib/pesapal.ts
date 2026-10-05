export function pesapalConfigured(){return Boolean(process.env.PESAPAL_CONSUMER_KEY&&process.env.PESAPAL_CONSUMER_SECRET&&process.env.PESAPAL_IPN_ID)}
export async function createPesapalOrder(){if(!pesapalConfigured())throw new Error('PESAPAL_NOT_CONFIGURED');throw new Error('PESAPAL_PROVIDER_TODO_CONFIGURE_CREDENTIALS')}
