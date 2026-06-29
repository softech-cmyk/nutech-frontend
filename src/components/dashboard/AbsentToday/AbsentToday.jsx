import { useState } from "react";
import { FaCheck, FaTimes } from "react-icons/fa";
import "./AbsentToday.css";

const AbsentToday = () => {

  const leaveTypes = ["EL", "SL", "PWL", "CL"];

  const [openLeaveIndex, setOpenLeaveIndex] = useState(null);


  const [entries, setEntries] = useState([
    {
      name:"John Doe",
      reason:"Family emergency",
      leaveType:"CL",
      status:"pending"
    },
    {
      name:"Jane Smith",
      reason:"Medical appointment",
      leaveType:"SL",
      status:"pending"
    },
    {
      name:"Ravi Kumar",
      reason:"Travel delay",
      leaveType:"EL",
      status:"pending"
    },
    {
      name:"Amit Sharma",
      reason:"Personal work",
      leaveType:"PWL",
      status:"pending"
    },
    {
      name:"Priya Singh",
      reason:"Health issue",
      leaveType:"SL",
      status:"pending"
    },
    {
      name:"Rahul Verma",
      reason:"Family function",
      leaveType:"CL",
      status:"pending"
    },
    {
      name:"Neha Gupta",
      reason:"Emergency",
      leaveType:"EL",
      status:"pending"
    },
    {
      name:"Arjun Mehta",
      reason:"Travel",
      leaveType:"PWL",
      status:"pending"
    }
  ]);



  const changeLeaveType=(index,type)=>{

    const updated=[...entries];

    updated[index].leaveType=type;

    setEntries(updated);

    setOpenLeaveIndex(null);

  };



  const changeStatus=(index,status)=>{

    const updated=[...entries];

    updated[index].status=status;

    setEntries(updated);

  };



  return (


<div className="absent-today">


<div className="present-table-container">


<div className="table-actions">


<h2>
Absent Today
</h2>


<p className="table-sub">
Manager review board — approve or reject employee leave requests.
</p>


</div>



<div className="present-table-wrap">


<table className="present-table">


<thead>

<tr>

<th>
Employee
</th>

<th>
Reason
</th>

<th>
Leave Type
</th>

<th>
Manager Action
</th>

</tr>

</thead>



<tbody>


{

entries.map((entry,index)=>(


<tr key={index}>


<td>


<div className="user-info">


<div className="user-avatar">

{entry.name.charAt(0)}

</div>


<span>

{entry.name}

</span>


</div>


</td>




<td>
{entry.reason}
</td>




<td>


<div className="leave-box">


<button

className="leave-trigger"

onClick={()=>setOpenLeaveIndex(
openLeaveIndex===index ? null:index
)}

>

{entry.leaveType}

</button>



{

openLeaveIndex===index &&


<div className="leave-menu">


{

leaveTypes.map(type=>(


<button

key={type}

onClick={()=>changeLeaveType(index,type)}

>

{type}

</button>


))


}


</div>


}



</div>


</td>





<td>


<div className="action-cell">


{

entry.status==="pending" &&

<>


<button

className="approve-btn"

onClick={()=>changeStatus(index,"approved")}

>

<FaCheck/>

Approve

</button>




<button

className="reject-btn"

onClick={()=>changeStatus(index,"rejected")}

>

<FaTimes/>

Reject

</button>


</>


}





{

entry.status==="approved" &&


<button

className="approved-status"

onClick={()=>changeStatus(index,"pending")}

>

<FaCheck/>

Approved

</button>


}





{

entry.status==="rejected" &&


<button

className="rejected-status"

onClick={()=>changeStatus(index,"pending")}

>

<FaTimes/>

Rejected

</button>


}



</div>


</td>



</tr>


))


}



</tbody>


</table>


</div>


</div>


</div>


  );

};


export default AbsentToday;