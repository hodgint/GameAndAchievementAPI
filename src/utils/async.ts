// testing async wrapper to allow for fewer copied lines when calling async functions from other api's
async function asyncWrapper<T>(func: () => T | Promise<T>): Promise<T> {
    try{
      const result = await func()
      return result;  
    }catch(error){
        console.error("Error in wrapped function: ", error)
        throw error;
    }
    
}