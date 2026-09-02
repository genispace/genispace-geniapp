export const getIconColor = (type: string) => {

    const typeHash = Array.from(type.toLowerCase())
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const colors = [
      'from-blue-500 to-cyan-500',      
      'from-purple-500 to-pink-500',    
      'from-green-500 to-emerald-500',  
      'from-orange-500 to-amber-500',   
      'from-indigo-500 to-violet-500',  
      'from-rose-500 to-pink-500',      
      'from-teal-500 to-cyan-500',      
      'from-fuchsia-500 to-purple-500', 
      'from-lime-500 to-green-500',     
      'from-cyan-500 to-blue-500',      
      'from-gray-500 to-slate-500',     
      'from-red-500 to-orange-500',     
      'from-yellow-500 to-amber-500',   
      'from-green-500 to-emerald-500',  
      'from-indigo-500 to-violet-500',  
      'from-purple-500 to-pink-500',    
      'from-gray-500 to-slate-500',     
      'from-red-500 to-orange-500',     
      'from-yellow-500 to-amber-500',   
      'from-green-500 to-emerald-500',  
      'from-indigo-500 to-violet-500',  
      'from-purple-500 to-pink-500',    
      'from-gray-500 to-slate-500',     
      'from-red-500 to-orange-500',     
      'from-yellow-500 to-amber-500',   
      'from-green-500 to-emerald-500',  
      'from-indigo-500 to-violet-500',  
      'from-purple-500 to-pink-500',    
    ];

    return colors[typeHash % colors.length] || 'from-gray-500 to-slate-500';
  };