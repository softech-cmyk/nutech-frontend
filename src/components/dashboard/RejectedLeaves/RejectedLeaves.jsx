import { useState } from "react";
import { FaCalendar, FaUserCircle, FaTimesCircle } from "react-icons/fa";
import "./RejectedLeaves.css";

const RejectedLeaves = () => {

  const today = new Date().toISOString().split("T")[0];

  const [filterType, setFilterType] = useState("today");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [year, setYear] = useState(new Date().getFullYear());
  const [showFilter, setShowFilter] = useState(false);


  const rejectedLeaves = [
    {
      id:1,
      name:"John Doe",
      department:"Software Development",
      date:"2026-06-25",
      leaveType:"CL",
      reason:"Insufficient notice period",
      status:"Rejected"
    },

    {
      id:2,
      name:"Jane Smith",
      department:"Human Resources",
      date:"2026-06-25",
      leaveType:"EL",
      reason:"Leave quota exceeded",
      status:"Rejected"
    },

    {
      id:3,
      name:"Ravi Kumar",
      department:"Research Department",
      date:"2026-06-24",
      leaveType:"SL",
      reason:"Conflicting approval request",
      status:"Rejected"
    },

    {
      id:4,
      name:"Alice Brown",
      department:"Finance",
      date:"2026-06-24",
      leaveType:"CL",
      reason:"Project deadline conflict",
      status:"Rejected"
    },

    {
      id:5,
      name:"Bob Wilson",
      department:"Marketing",
      date:"2026-06-23",
      leaveType:"EL",
      reason:"Late leave application",
      status:"Rejected"
    },

    {
      id:6,
      name:"David Miller",
      department:"IT Support",
      date:"2026-06-22",
      leaveType:"PWL",
      reason:"Company policy issue",
      status:"Rejected"
    },

    {
      id:7,
      name:"Emily Johnson",
      department:"Quality Assurance",
      date:"2026-06-21",
      leaveType:"SL",
      reason:"Team availability issue",
      status:"Rejected"
    },

    {
      id:8,
      name:"Michael Scott",
      department:"Operations",
      date:"2026-06-20",
      leaveType:"CL",
      reason:"Incomplete documents",
      status:"Rejected"
    },

    {
      id:9,
      name:"Sarah Williams",
      department:"Analytics",
      date:"2026-06-19",
      leaveType:"EL",
      reason:"Multiple leaves taken",
      status:"Rejected"
    },

    {
      id:10,
      name:"Chris Evans",
      department:"Administration",
      date:"2026-06-18",
      leaveType:"SL",
      reason:"Manager unavailable",
      status:"Rejected"
    },

    {
      id:11,
      name:"Robert Taylor",
      department:"Production",
      date:"2026-06-17",
      leaveType:"CL",
      reason:"Workload restrictions",
      status:"Rejected"
    },

    {
      id:12,
      name:"Sophia Anderson",
      department:"Analytics",
      date:"2026-06-16",
      leaveType:"PWL",
      reason:"Wrong leave category",
      status:"Rejected"
    },

    {
      id:13,
      name:"Olivia Martinez",
      department:"Software Development",
      date:"2026-06-15",
      leaveType:"CL",
      reason:"Sprint deadline conflict",
      status:"Rejected"
    },

    {
      id:14,
      name:"James Anderson",
      department:"Customer Support",
      date:"2026-06-14",
      leaveType:"SL",
      reason:"Shift coverage unavailable",
      status:"Rejected"
    },

    {
      id:15,
      name:"Mia Thompson",
      department:"Design",
      date:"2026-06-13",
      leaveType:"EL",
      reason:"Pending handover tasks",
      status:"Rejected"
    }
  ];



  const filteredLeaves = rejectedLeaves.filter((leave)=>{


    if(filterType==="today"){
      return leave.date === today;
    }


    if(filterType==="range"){
      return (
        leave.date >= startDate &&
        leave.date <= endDate
      );
    }


    if(filterType==="year"){
      return leave.date.startsWith(year.toString());
    }


    return true;

  });



return (

<div className="rejected-leaves">


<div className="rejected-card">


<div className="header-section">


<div>

<h2>
Rejected Leaves
</h2>

<p>
Manage and review rejected employee leave requests
</p>

</div>



<button
className="date-btn"
onClick={()=>setShowFilter(!showFilter)}
>

<FaCalendar/>
Date Filter

</button>



{
showFilter && (

<div className="filter-box">


<label>

<input
type="radio"
checked={filterType==="today"}
onChange={()=>setFilterType("today")}
/>

Today

</label>



<label>

<input
type="radio"
checked={filterType==="range"}
onChange={()=>setFilterType("range")}
/>

Date Range

</label>



{
filterType==="range" &&

<div className="range-box">

<input
type="date"
value={startDate}
onChange={(e)=>setStartDate(e.target.value)}
/>


<span>
To
</span>


<input
type="date"
value={endDate}
onChange={(e)=>setEndDate(e.target.value)}
/>


</div>

}




<label>

<input
type="radio"
checked={filterType==="year"}
onChange={()=>setFilterType("year")}
/>

Year

</label>



{
filterType==="year" &&

<input
className="year-box"
type="number"
value={year}
onChange={(e)=>setYear(e.target.value)}
/>

}



</div>

)

}


</div>





<div className="table-wrapper">


<table>


<thead>

<tr>

<th>Employee</th>

<th>Department</th>

<th>Date</th>

<th>Leave Type</th>

<th>Reason</th>

<th>Status</th>

</tr>

</thead>



<tbody>


{
filteredLeaves.map((leave)=>(


<tr key={leave.id}>


<td>

<div className="employee">

<div className="avatar">

<FaUserCircle/>

</div>


<span>
{leave.name}
</span>


</div>

</td>




<td>
{leave.department}
</td>



<td>
{leave.date}
</td>



<td>

<span className="leave-type">

{leave.leaveType}

</span>


</td>




<td>
{leave.reason}
</td>




<td>

<span className="rejected-status">

<FaTimesCircle/>

{leave.status}

</span>


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


export default RejectedLeaves;