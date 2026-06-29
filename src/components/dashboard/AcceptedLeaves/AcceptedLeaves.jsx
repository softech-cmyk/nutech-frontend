import "./AcceptedLeaves.css";

const AcceptedLeaves = () => {

  const acceptedLeaves = [
    { name: "John Doe", reason: "Family emergency", date: "2026-06-25", status: "Approved" },
    { name: "Jane Smith", reason: "Medical appointment", date: "2026-06-25", status: "Approved" },
    { name: "Ravi Kumar", reason: "Travel delay", date: "2026-06-25", status: "Approved" },
    { name: "Amit Sharma", reason: "Personal work", date: "2026-06-26", status: "Approved" },
    { name: "Priya Singh", reason: "Health issue", date: "2026-06-26", status: "Approved" },
    { name: "Rahul Verma", reason: "Family function", date: "2026-06-26", status: "Approved" },
    { name: "Neha Gupta", reason: "Emergency leave", date: "2026-06-27", status: "Approved" },
    { name: "Arjun Mehta", reason: "Travel purpose", date: "2026-06-27", status: "Approved" },
    { name: "Karan Patel", reason: "Medical reason", date: "2026-06-27", status: "Approved" }
  ];


  return (

    <div className="accepted-leaves">


      <div className="present-table-container">


        <div className="table-actions">

          <h2>Accepted Leaves</h2>

          <p className="table-sub">
            Manage approved employee leave requests.
          </p>

        </div>



        <div className="present-table-wrap">


          <table className="present-table">


            <thead>

              <tr>

                <th>Employee</th>
                <th>Reason</th>
                <th>Date</th>
                <th>Status</th>

              </tr>

            </thead>



            <tbody>


              {
                acceptedLeaves.map((leave,index)=>(

                  <tr key={index}>


                    <td>

                      <div className="user-info">

                        <div className="user-avatar">
                          {leave.name.charAt(0)}
                        </div>

                        <span>
                          {leave.name}
                        </span>

                      </div>

                    </td>



                    <td>
                      {leave.reason}
                    </td>



                    <td>
                      {leave.date}
                    </td>



                    <td>

                      <span className="status-badge">

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


export default AcceptedLeaves;